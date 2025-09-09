# app/explore/routes.py
from flask import Blueprint, jsonify, request
from sqlalchemy import or_, func
from flask_jwt_extended import jwt_required
from ..models import Fundraiser
from ..extensions import db
from ..decorators import tenant_required

explore_bp = Blueprint("explore", __name__)

def _serialize_public_item(f: Fundraiser):
    return {
        "id": str(f.id),
        "title": f.title,
        "description": f.description,
        "goal_amount": float(f.goal_amount),
        "current_amount": float(f.current_amount or 0),
        "cover_image_url": f.cover_image_url,
        "city": f.city,
        "state": f.state,
        "public_slug": f.public_slug,
        "created_at": f.created_at.isoformat(),
    }

@explore_bp.route("/explore/fundraisers", methods=["GET"])
def list_public_fundraisers():
    page = max(int(request.args.get("page", 1)), 1)
    limit = min(max(int(request.args.get("limit", 12)), 1), 100)
    search = (request.args.get("search") or "").strip()
    city = (request.args.get("city") or "").strip()
    state = (request.args.get("state") or "").strip()

    q = Fundraiser.query.filter(Fundraiser.is_public.is_(True))
    if search:
        like = f"%{search.lower()}%"
        q = q.filter(or_(func.lower(Fundraiser.title).like(like),
                         func.lower(Fundraiser.description).like(like)))
    if city:
        q = q.filter(func.lower(Fundraiser.city) == city.lower())
    if state:
        q = q.filter(func.lower(Fundraiser.state) == state.lower())

    total = q.count()
    items = q.order_by(Fundraiser.created_at.desc()).offset((page-1)*limit).limit(limit).all()

    return jsonify({
        "fundraisers": [_serialize_public_item(f) for f in items],
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": (total + limit - 1) // limit
    }), 200

@explore_bp.route("/explore/fundraisers/<slug>", methods=["GET"])
def get_public_by_slug(slug):
    f = Fundraiser.query.filter_by(public_slug=slug, is_public=True).first()
    if not f:
        return jsonify({"error":"not_found"}), 404
    # Reaproveita estrutura do seu public endpoint
    return jsonify({
        "id": str(f.id),
        "title": f.title,
        "description": f.description,
        "goal_amount": float(f.goal_amount),
        "current_amount": float(f.current_amount or 0),
        "city": f.city,
        "state": f.state,
        "cover_image_url": f.cover_image_url,
        "owner_name": f.owner.name,
        "public_slug": f.public_slug,
        "created_at": f.created_at.isoformat(),
    }), 200
