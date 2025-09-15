# app/contributions/routes.py
import uuid
from decimal import Decimal, InvalidOperation
from flask import Blueprint, request, jsonify, abort, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from ..extensions import db
from ..models import Contribution, Fundraiser, PaymentStatus, FundraiserStatus

contributions_bp = Blueprint("contributions", __name__)


def _get_fundraiser_or_404(fundraiser_id: str) -> Fundraiser:
    f = Fundraiser.query.get(fundraiser_id)
    if not f:
        abort(404)
    return f


@contributions_bp.route("/fundraisers/<fundraiser_id>/contributions", methods=["POST"])
@jwt_required(optional=True)
def create_contribution(fundraiser_id):
    """Cria uma contribuição para uma vaquinha.

    Qualquer usuário (logado ou não) pode contribuir. Se o usuário estiver logado,
    seu ``contributor_user_id`` será armazenado.
    """
    fundraiser = _get_fundraiser_or_404(fundraiser_id)

    if fundraiser.status != FundraiserStatus.ACTIVE:
        return jsonify({
            "error": "fundraiser_not_active",
            "message": "Esta vaquinha não está ativa para receber contribuições."
        }), 422

    data = request.get_json() or {}
    amount_in = data.get("amount")

    # validação e conversão de amount para Decimal
    try:
        amount = Decimal(str(amount_in))
        if amount < 20:
            raise InvalidOperation()
    except (InvalidOperation, TypeError):
        return jsonify({"error": "invalid_request", "message": "Valor da contribuição inválido"}), 422

    message = data.get("message")
    is_anonymous = bool(data.get("is_anonymous", False))

    # se autenticado, armazena o user
    contributor_user_id = get_jwt_identity()
    if contributor_user_id:
        contributor_user_id = uuid.UUID(str(contributor_user_id))

    # chama serviço de pagamento (mock/real)
    payment_data = current_app.payment_service.create_payment_intent(float(amount))

    contribution = Contribution(
        # REMOVIDO: tenant_id=...,  <- o model Contribution não possui essa coluna
        fundraiser_id=fundraiser.id,
        contributor_user_id=contributor_user_id,  # pode ser None (anônimo)
        amount=amount,  # Decimal vai para Numeric(scale=2)
        message=message,
        is_anonymous=is_anonymous,
        payment_status=PaymentStatus.PENDING,
        payment_intent_id=payment_data["payment_intent_id"],
    )
    db.session.add(contribution)
    db.session.commit()

    return jsonify(payment_data), 201


@contributions_bp.route("/contributions/mine", methods=["GET"])
@jwt_required()
def list_my_contributions():
    """Lista contribuições feitas pelo usuário autenticado."""
    user_id = uuid.UUID(str(get_jwt_identity()))

    contributions = (
        Contribution.query
        .filter_by(contributor_user_id=user_id)
        .order_by(Contribution.created_at.desc())
        .all()
    )
    return jsonify([
        {
            "id": str(c.id),
            "fundraiser_id": str(c.fundraiser_id),
            "amount": float(c.amount),
            "message": c.message,
            "is_anonymous": c.is_anonymous,
            "payment_status": c.payment_status.value,
            "created_at": c.created_at.isoformat(),
        }
        for c in contributions
    ]), 200


@contributions_bp.route("/payments/callback", methods=["POST"])
def payment_callback():
    """Webhook do pagamento: atualiza status e incrementa o current_amount da vaquinha."""
    data = request.get_json() or {}
    payment_intent_id = data.get("payment_intent_id")
    status = data.get("status")
    if not payment_intent_id or status not in ("paid", "failed"):
        return jsonify({"error": "invalid_request"}), 400

    contribution = Contribution.query.filter_by(payment_intent_id=payment_intent_id).first()
    if not contribution:
        return jsonify({"error": "not_found"}), 404

    contribution.payment_status = PaymentStatus.PAID if status == "paid" else PaymentStatus.FAILED
    db.session.add(contribution)

    if status == "paid":
        fundraiser = Fundraiser.query.get(contribution.fundraiser_id)
        fundraiser.current_amount = (fundraiser.current_amount or 0) + contribution.amount
        db.session.add(fundraiser)

    db.session.commit()
    return jsonify({"message": "payment updated"}), 200
