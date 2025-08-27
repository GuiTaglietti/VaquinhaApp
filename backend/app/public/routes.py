"""Endpoints públicos para visualização de vaquinhas sem autenticação."""

from flask import Blueprint, jsonify
from sqlalchemy.orm import joinedload

from ..extensions import db
from ..models import Fundraiser, Contribution
from ..utils import validate_audit_token

public_bp = Blueprint("public", __name__)


@public_bp.route("/p/<public_slug>", methods=["GET"])
def get_public_fundraiser(public_slug):
    """Retorna dados públicos de uma vaquinha através do slug."""
    fundraiser = Fundraiser.query.filter_by(public_slug=public_slug, is_public=True).first()
    if not fundraiser:
        return jsonify({"error": "not_found"}), 404
    return jsonify({
        "id": str(fundraiser.id),
        "title": fundraiser.title,
        "description": fundraiser.description,
        "goal_amount": float(fundraiser.goal_amount),
        "current_amount": float(fundraiser.current_amount),
        "city": fundraiser.city,
        "state": fundraiser.state,
        "cover_image_url": fundraiser.cover_image_url,
        "owner_name": fundraiser.owner.name,
    })


@public_bp.route("/a/<audit_token>", methods=["GET"])
def get_audit_view(audit_token):
    """Retorna dados completos de uma vaquinha a partir de um token de auditoria."""
    fundraiser_id = validate_audit_token(audit_token)
    if not fundraiser_id:
        return jsonify({"error": "invalid_token"}), 400

    fundraiser = Fundraiser.query.options(joinedload(Fundraiser.contributions)).get(fundraiser_id)
    if not fundraiser:
        return jsonify({"error": "not_found"}), 404

    contributions_data = []
    for c in fundraiser.contributions:
        contributions_data.append({
            "id": str(c.id),
            "amount": float(c.amount),
            "message": c.message,
            "is_anonymous": c.is_anonymous,
            "payment_status": c.payment_status.value,
            "created_at": c.created_at.isoformat(),
        })
    return jsonify({
        "id": str(fundraiser.id),
        "title": fundraiser.title,
        "description": fundraiser.description,
        "goal_amount": float(fundraiser.goal_amount),
        "current_amount": float(fundraiser.current_amount),
        "status": fundraiser.status.value,
        "city": fundraiser.city,
        "state": fundraiser.state,
        "cover_image_url": fundraiser.cover_image_url,
        "is_public": fundraiser.is_public,
        "public_slug": fundraiser.public_slug,
        "owner": {
            "id": str(fundraiser.owner.id),
            "name": fundraiser.owner.name,
            "email": fundraiser.owner.email,
        },
        "contributions": contributions_data,
    })