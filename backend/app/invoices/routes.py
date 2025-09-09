from flask import jsonify, Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..decorators import tenant_required
from ..models import Invoice, User

invoices_bp = Blueprint("invoices", __name__)

@invoices_bp.get("/invoices")
@jwt_required()
@tenant_required
def list_invoices():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "not_found", "message": "Usuário não encontrado"}), 404

    q = (
        db.session.query(Invoice)
        .join(Invoice.fundraiser)
        .filter_by(owner_user_id=user.id)
        .order_by(Invoice.issued_at.desc())
    )
    items = [inv.to_dict() for inv in q.all()]
    return jsonify(items), 200

