# app/fundraisers/routes.py
"""Endpoints relacionados às vaquinhas (fundraisers).

Fornece CRUD completo, além de rotas para gerar links públicos e de auditoria.
"""
import uuid
from flask import Blueprint, request, jsonify, g, abort
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Fundraiser, FundraiserStatus
from ..utils import generate_slug, generate_audit_token
from ..decorators import tenant_required

fundraisers_bp = Blueprint("fundraisers", __name__)


def _get_fundraiser_or_404(fundraiser_id: str) -> Fundraiser:
    f = Fundraiser.query.get(fundraiser_id)
    # escopo: o dono é o "tenant"
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

    # escopo/owner = usuário autenticado
    user_id = g.user_id

    f = Fundraiser(
        # REMOVIDO: tenant_id=user_id,  ← o model não tem essa coluna
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
