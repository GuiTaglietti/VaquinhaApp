import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)

from ..extensions import db
from ..models import User
from ..utils import hash_password, verify_password

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not all([name, email, password]):
        return jsonify({"error": "invalid_request", "message": "Campos obrigatórios ausentes"}), 400

    # unicidade global de email (um user = um tenant)
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "user_exists", "message": "Email já cadastrado"}), 400

    # cria o usuário; id é gerado no flush
    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
    )
    db.session.add(user)
    db.session.flush()  # garante que user.id foi gerado

    # se seu User ainda tem coluna tenant_id, mantenha estas 2 linhas:
    if hasattr(User, "tenant_id"):
        user.tenant_id = user.id
        db.session.add(user)

    db.session.commit()
    return jsonify({"message": "Usuário registrado com sucesso"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    if not all([email, password]):
        return jsonify({"error": "invalid_request", "message": "Campos obrigatórios ausentes"}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not verify_password(password, user.password_hash):
        return jsonify({"error": "invalid_credentials", "message": "Credenciais inválidas"}), 401

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    return jsonify({"access": access_token, "refresh": refresh_token}), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({"access": access_token}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = uuid.UUID(str(get_jwt_identity()))
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "not_found", "message": "Usuário não encontrado"}), 404

    payload = {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
    }
    # se User ainda tiver coluna tenant_id, retorne-a também
    if hasattr(User, "tenant_id"):
        payload["tenant_id"] = str(user.tenant_id)

    return jsonify(payload), 200
