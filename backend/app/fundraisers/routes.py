# app/fundraisers/routes.py
"""Endpoints relacionados às vaquinhas (fundraisers).

Fornece CRUD completo, além de rotas para gerar links públicos e de auditoria.
"""
import uuid
from flask import Blueprint, request, jsonify, g, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, distinct

from ..extensions import db
from ..models import Fundraiser, FundraiserStatus
from ..utils import generate_slug, generate_audit_token
from ..decorators import tenant_required
from ..utils import is_profile_complete, user_has_bank_account
from ..models import User
from ..utils import iso_utc
from ..models import Fundraiser, FundraiserStatus, Contribution, PaymentStatus


fundraisers_bp = Blueprint("fundraisers", __name__)

def _get_fundraiser_or_404(fundraiser_id: str) -> Fundraiser:
    f = Fundraiser.query.get(fundraiser_id)
    if not f or str(f.owner_user_id) != str(g.tenant_id):
        abort(404)
    
    return f


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
            "message": "Complete seu perfil (documentos, telefone e endereço) para criar uma vaquinha."
        }), 403
    
    if not user_has_bank_account(u):
        return jsonify({
            "error": "no_bank_account",
            "message": "Cadastre ao menos uma conta bancária para criar uma vaquinha."
        }), 403

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
        from ..utils import generate_slug
        f.public_slug = generate_slug(title)

    db.session.add(f)
    db.session.commit()
    return jsonify({"id": str(f.id), "public_slug": f.public_slug}), 201


@fundraisers_bp.route("", methods=["GET"])
@tenant_required
@jwt_required()
def list_fundraisers():
    """Lista vaquinhas do usuário autenticado (owner = escopo)."""
    user_id = g.user_id
    items = Fundraiser.query.filter_by(owner_user_id=user_id).all()
    return jsonify([
        {
            "id": str(f.id),
            "title": f.title,
            "description": f.description,
            "goal_amount": float(f.goal_amount),
            "current_amount": float(f.current_amount),
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
        return jsonify({"error": "not_found", "message": "Vaquinha não encontrada"}), 404

    current_user_id = get_jwt_identity()
    is_owner = current_user_id and (str(uuid.UUID(str(current_user_id))) == str(f.owner_user_id))
    if not is_owner and not f.is_public:
        return jsonify({"error": "forbidden", "message": "Acesso negado"}), 403

    return jsonify({
        "id": str(f.id),
        "title": f.title,
        "description": f.description,
        "goal_amount": float(f.goal_amount),
        "current_amount": float(f.current_amount),
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

    # só o dono pode editar
    if str(f.owner_user_id) != str(g.user_id):
        return jsonify({"error": "forbidden", "message": "Apenas o proprietário pode editar"}), 403

    data = request.get_json() or {}
    for field in ["title", "description", "goal_amount", "city", "state", "cover_image_url", "is_public"]:
        if field in data:
            setattr(f, field, data[field])

    if f.is_public and not f.public_slug:
        f.public_slug = generate_slug(f.title)

    db.session.commit()
    return jsonify({"message": "Vaquinha atualizada"}), 200


@fundraisers_bp.route("/<fundraiser_id>", methods=["DELETE"])
@tenant_required
@jwt_required()
def delete_fundraiser(fundraiser_id):
    f = _get_fundraiser_or_404(fundraiser_id)
    if str(f.owner_user_id) != str(g.user_id):
        return jsonify({"error": "forbidden", "message": "Apenas o proprietário pode excluir"}), 403

    db.session.delete(f)
    db.session.commit()
    return jsonify({"message": "Vaquinha removida"}), 200


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
        return jsonify({"error": "not_found", "message": "Vaquinha não encontrada"}), 404

    # Contribuições (pagas, p/ saldo e indicadores)
    contribs = Contribution.query.filter(
        Contribution.fundraiser_id == f.id
    ).order_by(Contribution.created_at.desc()).all()

    # Totais (pagos)
    paid_contribs = [c for c in contribs if c.payment_status == PaymentStatus.PAID]
    total_contributions = len(paid_contribs)

    # Contribuidores: distintos por usuário + cada anônima conta como 1
    distinct_users = {str(c.contributor_user_id) for c in paid_contribs if c.contributor_user_id}
    anon_count = sum(1 for c in paid_contribs if c.is_anonymous)
    total_contributors = len(distinct_users) + anon_count

    # Somas
    def _dec(v): 
        from decimal import Decimal
        return v if isinstance(v, Decimal) else (Decimal(str(v)) if v is not None else Decimal("0"))

    total_paid_amount = sum(_dec(c.amount) for c in paid_contribs)

    from ..models import Withdrawal, WithdrawalStatus  # evitar import circular
    withdrawals = Withdrawal.query.filter(
        Withdrawal.fundraiser_id == f.id
    ).order_by(Withdrawal.requested_at.desc()).all()

    total_withdrawn = sum(_dec(w.amount) for w in withdrawals if w.status == WithdrawalStatus.COMPLETED)
    held_withdrawals = sum(_dec(w.amount) for w in withdrawals if w.status in (WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING, WithdrawalStatus.COMPLETED))
    available_balance = total_paid_amount - held_withdrawals
    if available_balance < 0:
        available_balance = _dec("0")

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
        "available_balance": float(available_balance),
        "total_withdrawn": float(total_withdrawn),
    }
    return jsonify(payload), 200
