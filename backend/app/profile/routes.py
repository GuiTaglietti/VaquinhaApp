from datetime import datetime
from flask import Blueprint, jsonify, request, g
from flask_jwt_extended import jwt_required
from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models import User, BankAccount, AccountType
from ..utils import only_digits, validate_cpf, validate_cnpj, is_cpf_in_use, is_cnpj_in_use
from ..decorators import tenant_required

profile_bp = Blueprint("profile", __name__)

def _serialize_user(u: User):
    return {
        "id": str(u.id),
        "name": u.name,
        "email": u.email,
        "document_type": u.document_type,
        "document_number": u.document_number,
        "rg": u.rg,
        "phone": u.phone,
        "birth_date": u.birth_date.date().isoformat() if u.birth_date else None,
        "address": {
            "street": u.addr_street,
            "number": u.addr_number,
            "complement": u.addr_complement,
            "neighborhood": u.addr_neighborhood,
            "city": u.addr_city,
            "state": u.addr_state,
            "zip_code": u.addr_zip_code,
        },
        "created_at": u.created_at.isoformat(),
        "updated_at": u.updated_at.isoformat(),
    }

def _serialize_bank_account(b: BankAccount):
    return {
        "id": str(b.id),
        "bank_code": b.bank_code,
        "bank_name": b.bank_name,
        "agency": b.agency,
        "account_number": b.account_number,
        "account_type": b.account_type.value,
        "account_holder_name": b.account_holder_name,
        "document_number": b.document_number,
        "is_default": b.is_default,
        "created_at": b.created_at.isoformat(),
        "updated_at": b.updated_at.isoformat(),
    }

@profile_bp.route("/profile", methods=["GET"])
@jwt_required()
@tenant_required
def get_profile():
    u: User = db.session.get(User, g.user_id)
    return jsonify(_serialize_user(u)), 200

@profile_bp.route("/profile", methods=["PATCH"])
@jwt_required()
@tenant_required
def update_profile():
    u: User = db.session.get(User, g.user_id)
    data = request.get_json() or {}

    if "name" in data:
        u.name = data["name"].strip()

    if "document_type" in data:
        if data["document_type"] not in ("CPF", "CNPJ"):
            return jsonify({"error":"invalid_document_type"}), 422
        u.document_type = data["document_type"]

    if "document_number" in data:
        num = only_digits(data["document_number"]) or ""

        if u.document_type == "CPF":
            if not validate_cpf(num):
                return jsonify({"error": "invalid_cpf"}), 422
            if is_cpf_in_use(num, exclude_user_id=u.id, tenant_id=getattr(g, "tenant_id", None)):
                return jsonify({"error": "cpf_already_registered"}), 409

        elif u.document_type == "CNPJ":
            if not validate_cnpj(num):
                return jsonify({"error": "invalid_cnpj"}), 422
            if is_cnpj_in_use(num, exclude_user_id=u.id, tenant_id=getattr(g, "tenant_id", None)):
                return jsonify({"error": "cnpj_already_registered"}), 409

        u.document_number = num

    if "rg" in data:
        u.rg = (data["rg"] or "").strip()

    if "phone" in data:
        u.phone = only_digits(data["phone"])

    if "birth_date" in data and data["birth_date"]:
        try:
            u.birth_date = datetime.fromisoformat(data["birth_date"])
        except Exception:
            return jsonify({"error":"invalid_birth_date"}), 422

    addr = data.get("address") or {}
    for k_map in [
        ("street","addr_street"),
        ("number","addr_number"),
        ("complement","addr_complement"),
        ("neighborhood","addr_neighborhood"),
        ("city","addr_city"),
        ("state","addr_state"),
        ("zip_code","addr_zip_code"),
    ]:
        if k_map[0] in addr:
            setattr(u, k_map[1], addr[k_map[0]])

    db.session.commit()
    return jsonify(_serialize_user(u)), 200

@profile_bp.route("/profile/bank-accounts", methods=["GET"])
@jwt_required()
@tenant_required
def list_bank_accounts():
    u: User = db.session.get(User, g.user_id)
    return jsonify([_serialize_bank_account(b) for b in u.bank_accounts]), 200

@profile_bp.route("/profile/bank-accounts", methods=["POST"])
@jwt_required()
@tenant_required
def create_bank_account():
    u: User = db.session.get(User, g.user_id)
    data = request.get_json() or {}

    required = ["bank_code","agency","account_number","account_type","account_holder_name","document_number"]
    if not all(data.get(k) for k in required):
        return jsonify({"error":"invalid_request","message":"Campos obrigatórios ausentes"}), 400

    if data["account_type"] not in ("CHECKING","SAVINGS"):
        return jsonify({"error":"invalid_account_type"}), 422

    doc = only_digits(data["document_number"])
    # valida doc se perfil do user indica tipo, senão tenta heurística
    if u.document_type == "CPF" and not validate_cpf(doc):
        return jsonify({"error":"invalid_cpf"}), 422
    if u.document_type == "CNPJ" and not validate_cnpj(doc):
        return jsonify({"error":"invalid_cnpj"}), 422

    b = BankAccount(
        owner_user_id=u.id,
        bank_code=str(data["bank_code"]),
        bank_name=data.get("bank_name"),
        agency=str(data["agency"]),
        account_number=str(data["account_number"]),
        account_type=AccountType[data["account_type"]],
        account_holder_name=data["account_holder_name"].strip(),
        document_number=doc,
        is_default=bool(data.get("is_default", False))
    )
    if b.is_default:
        # desmarca outras
        for other in u.bank_accounts:
            other.is_default = False

    db.session.add(b)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error":"duplicate_account"}), 409

    return jsonify(_serialize_bank_account(b)), 201

@profile_bp.route("/profile/bank-accounts/<bank_account_id>", methods=["PATCH"])
@jwt_required()
@tenant_required
def update_bank_account(bank_account_id):
    u: User = db.session.get(User, g.user_id)
    b: BankAccount = BankAccount.query.filter_by(id=bank_account_id, owner_user_id=u.id).first()
    if not b:
        return jsonify({"error":"not_found"}), 404

    data = request.get_json() or {}

    if "bank_code" in data: b.bank_code = str(data["bank_code"])
    if "bank_name" in data: b.bank_name = data["bank_name"]
    if "agency" in data: b.agency = str(data["agency"])
    if "account_number" in data: b.account_number = str(data["account_number"])
    if "account_type" in data:
        if data["account_type"] not in ("CHECKING","SAVINGS"):
            return jsonify({"error":"invalid_account_type"}), 422
        b.account_type = AccountType[data["account_type"]]
    if "account_holder_name" in data: b.account_holder_name = data["account_holder_name"].strip()
    if "document_number" in data:
        doc = only_digits(data["document_number"])
        if u.document_type == "CPF" and not validate_cpf(doc):
            return jsonify({"error":"invalid_cpf"}), 422
        if u.document_type == "CNPJ" and not validate_cnpj(doc):
            return jsonify({"error":"invalid_cnpj"}), 422
        b.document_number = doc
    if "is_default" in data and bool(data["is_default"]):
        for other in u.bank_accounts:
            other.is_default = False
        b.is_default = True
    elif "is_default" in data and not data["is_default"]:
        if b.is_default and len([x for x in u.bank_accounts if x.id != b.id]) > 0:
            b.is_default = False

    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error":"duplicate_account"}), 409

    return jsonify(_serialize_bank_account(b)), 200

@profile_bp.route("/profile/bank-accounts/<bank_account_id>", methods=["DELETE"])
@jwt_required()
@tenant_required
def delete_bank_account(bank_account_id):
    u: User = db.session.get(User, g.user_id)
    b: BankAccount = BankAccount.query.filter_by(id=bank_account_id, owner_user_id=u.id).first()
    if not b:
        return jsonify({"error":"not_found"}), 404

    was_default = b.is_default
    db.session.delete(b)
    db.session.commit()

    if was_default:
        remaining = BankAccount.query.filter_by(owner_user_id=u.id).order_by(BankAccount.created_at.desc()).all()
        if remaining:
            remaining[0].is_default = True
            db.session.commit()

    return jsonify({"message":"deleted"}), 200

@profile_bp.route("/profile/bank-accounts/<bank_account_id>/set-default", methods=["POST"])
@jwt_required()
@tenant_required
def set_default_bank_account(bank_account_id):
    u: User = db.session.get(User, g.user_id)
    b: BankAccount = BankAccount.query.filter_by(id=bank_account_id, owner_user_id=u.id).first()
    if not b:
        return jsonify({"error":"not_found"}), 404

    for other in u.bank_accounts:
        other.is_default = False
    b.is_default = True
    db.session.commit()
    return jsonify({"message":"ok"}), 200
