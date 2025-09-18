# app/fundraisers/routes.py
import uuid
import os
import datetime
from decimal import Decimal, ROUND_HALF_UP

from flask import Blueprint, request, jsonify, g, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func

from ..extensions import db
from ..decorators import tenant_required
from ..models import (
    User,
    Fundraiser,
    FundraiserStatus,
    Contribution,
    PaymentStatus,
    Withdrawal,
    WithdrawalStatus,
    LegalDoc, 
    LegalAcceptance
)
from ..utils import (
    generate_slug,
    generate_audit_token,
    is_profile_complete,
    user_has_bank_account,
    iso_utc,
)

fundraisers_bp = Blueprint("fundraisers", __name__)

# Taxas (lidas do .env)
FEE_MAINTENANCE_PERCENT = Decimal(os.getenv("FEE_MAINTENANCE_PERCENT", "4.99"))  # %
FEE_PER_DONATION = Decimal(os.getenv("FEE_PER_DONATION", "0.49"))                # R$
FEE_WITHDRAWAL_FIXED = Decimal(os.getenv("FEE_WITHDRAWAL_FIXED", "4.50"))        # R$


def _q(v) -> Decimal:
    """Arredonda para 2 casas decimais e garante Decimal mesmo com int/float/None."""
    if v is None:
        v = Decimal("0")
    elif not isinstance(v, Decimal):
        v = Decimal(str(v))
    return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _dec(v):
    """Converte valores para Decimal com fallback seguro."""
    if v is None:
        return Decimal("0")
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))


def _get_fundraiser_or_404(fundraiser_id: str) -> Fundraiser:
    f = Fundraiser.query.get(fundraiser_id)
    if not f or str(f.owner_user_id) != str(g.tenant_id):
        abort(404)
    return f

REQUIRED_DOC_KEYS = ("terms", "privacy", "fees")

def _client_locale() -> str:
    lang = (request.args.get("lang") or "").strip()
    if not lang:
        lang = (request.headers.get("Accept-Language") or "").split(",")[0].strip()
    return lang or "pt-BR"

def _latest_legal_by_key(keys: tuple[str, ...], locale: str) -> dict:
    """
    Retorna {key: {title, version, updated_at}} para a última versão ativa por key/locale.
    Se não houver doc para uma key, ela não aparece no dict (logo não é exigida).
    """
    rows = db.session.execute(
        text("""
            SELECT DISTINCT ON (key)
                   key, title, version, updated_at
              FROM legal_docs
             WHERE key = ANY(:keys)
               AND locale = :locale
               AND is_active = TRUE
             ORDER BY key, updated_at DESC
        """),
        {"keys": list(keys), "locale": locale},
    ).mappings().all()

    result = {}
    for r in rows:
        result[r["key"]] = {
            "title": r["title"],
            "version": r["version"],
            "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
        }
    return result

def _user_latest_acceptances(user_id, keys: tuple[str, ...]) -> dict:
    """
    Retorna {doc_key: version_aceita} considerando o aceite mais recente por key.
    """
    rows = db.session.execute(
        text("""
            SELECT DISTINCT ON (doc_key)
                   doc_key, version
              FROM legal_acceptances
             WHERE user_id = :uid
               AND doc_key = ANY(:keys)
             ORDER BY doc_key, accepted_at DESC
        """),
        {"uid": str(user_id), "keys": list(keys)},
    ).mappings().all()
    return {r["doc_key"]: r["version"] for r in rows}

def _check_legal_acceptance_or_412(user_id) -> tuple[bool, dict | None]:
    """
    Compara últimas versões ativas com o que o usuário aceitou.
    Retorna (ok, payload_erro_ou_None).
    """
    locale = _client_locale()
    latest = _latest_legal_by_key(REQUIRED_DOC_KEYS, locale)
    required_keys = tuple(latest.keys())
    user_ok = _user_latest_acceptances(user_id, required_keys)

    missing = []
    for k in required_keys:
        latest_ver = latest[k]["version"]
        accepted_ver = user_ok.get(k)
        if accepted_ver != latest_ver:
            missing.append({
                "key": k,
                "title": latest[k]["title"],
                "required_version": latest_ver,
                "accepted_version": accepted_ver,
            })

    if missing:
        return False, {
            "error": "legal_not_accepted",
            "message": "Você precisa aceitar os documentos legais atualizados para criar uma arrecadação.",
            "required": [
                {"key": k, "title": latest[k]["title"], "version": latest[k]["version"]}
                for k in required_keys
            ],
            "missing": missing,
            "locale": locale,
        }
    return True, None


@fundraisers_bp.route("", methods=["POST"])
@tenant_required
@jwt_required()
def create_fundraiser():
    data = request.get_json() or {}
    title = data.get("title")
    goal_amount = data.get("goal_amount")

    if not title or goal_amount is None:
        return jsonify({"error": "invalid_request", "message": "Título e meta são obrigatórios"}), 400

    user_id = g.user_id
    u: User = db.session.get(User, user_id)

    if not is_profile_complete(u):
        return jsonify({
            "error": "profile_incomplete",
            "message": "Complete seu perfil (documentos, telefone e endereço) para criar uma arrecadação."
        }), 403

    if not user_has_bank_account(u):
        return jsonify({
            "error": "no_bank_account",
            "message": "Cadastre ao menos uma conta bancária para criar uma arrecadação."
        }), 403

    for flag in ("terms_accepted", "privacy_accepted", "fees_accepted"):
        if flag in data and not bool(data.get(flag)):
            return jsonify({
                "error": "legal_flags_missing",
                "message": "É necessário aceitar termos, privacidade e taxas para criar a arrecadação."
            }), 400

    ok, err = _check_legal_acceptance_or_412(user_id)
    if not ok:
        return jsonify(err), 412

    f = Fundraiser(
        owner_user_id=user_id,
        title=title,
        description=data.get("description"),
        goal_amount=goal_amount,
        current_amount=0,
        city=data.get("city"),
        state=data.get("state"),
        cover_image_url=data.get("cover_image_url"),
        is_public=bool(data.get("is_public", False)),
    )

    if f.is_public and not f.public_slug:
        f.public_slug = generate_slug(title)

    db.session.add(f)
    db.session.commit()
    return jsonify({"id": str(f.id), "public_slug": f.public_slug}), 201


@fundraisers_bp.route("", methods=["GET"])
@tenant_required
@jwt_required()
def list_fundraisers():
    user_id = g.user_id
    items = Fundraiser.query.filter_by(owner_user_id=user_id).all()
    return jsonify([
        {
            "id": str(f.id),
            "title": f.title,
            "description": f.description,
            "goal_amount": float(_dec(f.goal_amount)),
            "current_amount": float(_dec(f.current_amount)),
            "status": f.status.value,
            "is_public": f.is_public,
            "public_slug": f.public_slug,
            "created_at": iso_utc(f.created_at),
            "updated_at": iso_utc(f.updated_at),
        }
        for f in items
    ]), 200


@fundraisers_bp.route("/<fundraiser_id>", methods=["GET"])
@tenant_required
@jwt_required(optional=True)
def get_fundraiser(fundraiser_id):
    """Retorna detalhes se o usuário for dono (escopo) ou se for pública."""
    f = Fundraiser.query.get(fundraiser_id)
    if not f or str(f.owner_user_id) != str(g.tenant_id):
        return jsonify({"error": "not_found", "message": "Arrecadação não encontrada"}), 404

    current_user_id = get_jwt_identity()
    is_owner = current_user_id and (str(uuid.UUID(str(current_user_id))) == str(f.owner_user_id))
    if not is_owner and not f.is_public:
        return jsonify({"error": "forbidden", "message": "Acesso negado"}), 403

    return jsonify({
        "id": str(f.id),
        "title": f.title,
        "description": f.description,
        "goal_amount": float(_dec(f.goal_amount)),
        "current_amount": float(_dec(f.current_amount)),
        "status": f.status.value,
        "city": f.city,
        "state": f.state,
        "cover_image_url": f.cover_image_url,
        "is_public": f.is_public,
        "public_slug": f.public_slug,
    }), 200


@fundraisers_bp.route("/<fundraiser_id>", methods=["PATCH"])
@tenant_required
@jwt_required()
def update_fundraiser(fundraiser_id):
    f = _get_fundraiser_or_404(fundraiser_id)

    if str(f.owner_user_id) != str(g.user_id):
        return jsonify({"error": "forbidden", "message": "Apenas o proprietário pode editar"}), 403

    data = request.get_json() or {}
    for field in ["title", "description", "goal_amount", "city", "state", "cover_image_url", "is_public"]:
        if field in data:
            setattr(f, field, data[field])

    if f.is_public and not f.public_slug:
        f.public_slug = generate_slug(f.title)

    db.session.commit()
    return jsonify({"message": "Arrecadação atualizada"}), 200


@fundraisers_bp.route("/<fundraiser_id>", methods=["DELETE"])
@tenant_required
@jwt_required()
def delete_fundraiser(fundraiser_id):
    f = _get_fundraiser_or_404(fundraiser_id)
    if str(f.owner_user_id) != str(g.user_id):
        return jsonify({"error": "forbidden", "message": "Apenas o proprietário pode excluir"}), 403

    db.session.delete(f)
    db.session.commit()
    return jsonify({"message": "Arrecadação removida"}), 200


@fundraisers_bp.route("/<fundraiser_id>/share/public", methods=["POST"])
@tenant_required
@jwt_required()
def share_public(fundraiser_id):
    f = _get_fundraiser_or_404(fundraiser_id)
    if str(f.owner_user_id) != str(g.user_id):
        return jsonify({"error": "forbidden", "message": "Apenas o proprietário pode compartilhar"}), 403

    if not f.public_slug:
        f.public_slug = generate_slug(f.title)
    f.is_public = True
    db.session.commit()
    return jsonify({"public_slug": f.public_slug}), 200


@fundraisers_bp.route("/<fundraiser_id>/share/audit", methods=["POST"])
@tenant_required
@jwt_required()
def share_audit(fundraiser_id):
    f = _get_fundraiser_or_404(fundraiser_id)
    if str(f.owner_user_id) != str(g.user_id):
        return jsonify({"error": "forbidden", "message": "Apenas o proprietário pode gerar link de auditoria"}), 403

    token, expires_at = generate_audit_token(str(f.id), expires_in=604800)
    f.audit_token_hash = token
    f.audit_token_expires_at = expires_at
    db.session.commit()
    return jsonify({"audit_token": token, "expires_at": expires_at.isoformat()}), 200


@fundraisers_bp.route("/<fundraiser_id>/stats", methods=["GET"])
@tenant_required
@jwt_required()
def fundraiser_stats(fundraiser_id):
    f = Fundraiser.query.get(fundraiser_id)
    if not f or str(f.owner_user_id) != str(g.tenant_id):
        return jsonify({"error": "not_found", "message": "Arrecadação não encontrada"}), 404

    # Todas contribuições (para lista "recentes")
    contribs = (
        Contribution.query
        .filter(Contribution.fundraiser_id == f.id)
        .order_by(Contribution.created_at.desc())
        .all()
    )

    # Apenas as pagas para contagem e somas
    paid_contribs = [c for c in contribs if c.payment_status == PaymentStatus.PAID]
    total_contributions = len(paid_contribs)

    # Contribuidores distintos (usuário logado) + anônimos contam como 1 cada
    distinct_users = {str(c.contributor_user_id) for c in paid_contribs if c.contributor_user_id}
    anon_count = sum(1 for c in paid_contribs if c.is_anonymous)
    total_contributors = len(distinct_users) + anon_count

    # Soma total das contribuições pagas (GROSS) — sempre Decimal
    total_paid_amount = sum((_dec(c.amount) for c in paid_contribs), Decimal("0"))

    # Saques (listar e calcular saldo)
    withdrawals = (
        Withdrawal.query
        .filter(Withdrawal.fundraiser_id == f.id)
        .order_by(Withdrawal.requested_at.desc())
        .all()
    )

    # Total efetivamente sacado (COMPLETED)
    total_withdrawn = sum((_dec(w.amount) for w in withdrawals if w.status == WithdrawalStatus.COMPLETED), Decimal("0"))

    # ======= APLICAÇÃO DAS TAXAS NO SALDO DISPONÍVEL =======
    # 1) líquido recebido das contribuições pagas
    fee_maintenance_amount = _q((total_paid_amount * FEE_MAINTENANCE_PERCENT) / Decimal("100"))
    fee_per_donation_total = _q(FEE_PER_DONATION * Decimal(total_contributions))
    net_before_withdrawals = _q(total_paid_amount - fee_maintenance_amount - fee_per_donation_total)
    if net_before_withdrawals < Decimal("0.00"):
        net_before_withdrawals = Decimal("0.00")

    # 2) desconta saques não-FAILED e suas taxas fixas já incorridas
    withdrawals_non_failed = [w for w in withdrawals if w.status in (WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING, WithdrawalStatus.COMPLETED)]
    sum_withdrawals_non_failed = _q(sum((_dec(w.amount) for w in withdrawals_non_failed), Decimal("0")))
    withdraw_fees_total_applied = _q(FEE_WITHDRAWAL_FIXED * Decimal(len(withdrawals_non_failed)))

    available_balance = _q(net_before_withdrawals - sum_withdrawals_non_failed - withdraw_fees_total_applied)
    if available_balance < Decimal("0.00"):
        available_balance = Decimal("0.00")
    # =======================================================

    # Recentes (últimos 10, qualquer status)
    recent = contribs[:10]

    def _format_contrib(c: Contribution):
        return {
            "id": str(c.id),
            "amount": float(_dec(c.amount)),
            "message": c.message,
            "is_anonymous": c.is_anonymous,
            "contributor_name": (c.contributor.name if (c.contributor and not c.is_anonymous) else None),
            "created_at": c.created_at.isoformat(),
        }

    def _serialize_withdrawal(w: Withdrawal):
        ba = w.bank_account
        return {
            "id": str(w.id),
            "fundraiser_id": str(w.fundraiser_id),
            "bank_account_id": str(w.bank_account_id),
            "amount": float(_dec(w.amount)),
            "description": w.description,
            "status": w.status.value,
            "requested_at": w.requested_at.isoformat(),
            "processed_at": w.processed_at.isoformat() if w.processed_at else None,
            "bank_account": {
                "id": str(ba.id) if ba else None,
                "bank_name": ba.bank_name if ba else None,
                "agency": ba.agency if ba else None,
                "account_number": ba.account_number if ba else None,
                "account_type": ba.account_type.value if (ba and ba.account_type) else None,
                "account_holder_name": ba.account_holder_name if ba else None,
            },
        }

    payload = {
        "total_contributions": total_contributions,
        "total_contributors": total_contributors,
        "recent_contributions": [_format_contrib(c) for c in recent],
        "withdrawals": [_serialize_withdrawal(w) for w in withdrawals],
        # Saldo disponível **líquido** (com taxas aplicadas)
        "available_balance": float(available_balance),
        "total_withdrawn": float(total_withdrawn),
    }
    return jsonify(payload), 200

@fundraisers_bp.route("/<fundraiser_id>/status", methods=["PATCH"])
@tenant_required
@jwt_required()
def update_status(fundraiser_id):
    f = _get_fundraiser_or_404(fundraiser_id)
    if str(f.owner_user_id) != str(g.user_id):
        return jsonify({"error": "forbidden", "message": "Apenas o proprietário pode alterar o status"}), 403

    data = request.get_json() or {}
    status_str = (data.get("status") or "").strip().upper()
    reason = (data.get("reason") or "").strip() or None

    if not status_str:
        return jsonify({"error": "invalid_request", "message": "status é obrigatório"}), 400

    try:
        new_status = FundraiserStatus[status_str]
    except KeyError:
        return jsonify({"error": "invalid_status", "message": "Status inválido. Use ACTIVE, PAUSED ou FINISHED."}), 400

    if new_status == f.status:
        return jsonify({"id": str(f.id), "status": f.status.value}), 200

    f.status = new_status

    if hasattr(f, "status_reason"):
        setattr(f, "status_reason", reason)
    if hasattr(f, "status_changed_at"):
        setattr(f, "status_changed_at", datetime.utcnow())

    db.session.add(f)
    db.session.commit()
    return jsonify({"id": str(f.id), "status": f.status.value}), 200