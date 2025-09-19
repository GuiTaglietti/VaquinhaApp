# app/contributions/routes.py
import uuid
from decimal import Decimal, InvalidOperation
from flask import Blueprint, request, jsonify, abort, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy.orm import joinedload

import json, hmac, hashlib, time

from ..extensions import db
from ..models import Contribution, Fundraiser, PaymentStatus, FundraiserStatus, User
from ..decorators import tenant_required

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

    Agora: NÃO exigimos payer.cpf/payer.name do cliente.
    Se houver usuário logado, usamos os dados dele (document_number/name/email).
    Se não houver, usamos fallbacks definidos no PaymentService.
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

    # Coletar payer do payload (se enviado) - vamos usá-lo como override,
    # senão tentamos pegar do usuário logado; se nada houver, PaymentService usa fallback.
    payer = data.get("payer", {}) or {}
    cpf_payload = (str(payer.get("cpf") or "").strip() or None)
    name_payload = (str(payer.get("name") or "").strip() or None)
    email_payload = (str(payer.get("email") or "").strip() or None)

    cpf = cpf_payload
    name = name_payload
    email = email_payload

    # Se há usuário logado, use os dados dele para preencher cpf/name/email quando ausentes
    if contributor_user_id:
        u: User | None = User.query.get(contributor_user_id)
        if u:
            # document_number deve conter o CPF do usuário (se você armazena assim)
            if not cpf and u.document_number:
                cpf = u.document_number.strip()
            if not name and u.name:
                name = u.name.strip()
            if not email and u.email:
                email = u.email.strip()

    # Agora **NÃO** exigimos cpf/name aqui. Deixamos o PaymentService aplicar fallback quando None.
    try:
        payment_data = current_app.payment_service.create_payment_intent(
            float(amount),
            cpf=cpf,
            name=name,
            email=email,
        )
    except Exception as e:
        return jsonify({"error": "payment_failed", "message": str(e)}), 400

    contribution = Contribution(
        fundraiser_id=fundraiser.id,
        contributor_user_id=contributor_user_id,
        amount=amount,
        message=message,
        is_anonymous=is_anonymous,
        payment_status=PaymentStatus.PENDING,
        payment_intent_id=payment_data["payment_intent_id"],  # **txid**
    )
    db.session.add(contribution)
    db.session.commit()

    return jsonify({
        "payment_intent_id": payment_data["payment_intent_id"],
        "pix_copia_e_cola": payment_data["pix_copia_e_cola"],
        "brcode": payment_data["brcode"],
    }), 201


@contributions_bp.route("/contributions/mine", methods=["GET"])
@jwt_required()
@tenant_required
def list_my_contributions():
    """Lista contribuições feitas pelo usuário autenticado, com dados da arrecadação embutidos."""
    try:
        user_id = uuid.UUID(str(get_jwt_identity()))
    except Exception:
        return jsonify({"error": "invalid_identity"}), 401

    q = (
        db.session.query(Contribution)
        .options(joinedload(Contribution.fundraiser))
        .filter(Contribution.contributor_user_id == user_id)
        .order_by(Contribution.created_at.desc())
    )

    items = []
    for c in q.all():
        f = c.fundraiser
        items.append({
            "id": str(c.id),
            "amount": float(c.amount),
            "message": c.message,
            "is_anonymous": c.is_anonymous,
            "payment_status": c.payment_status.value,
            "created_at": c.created_at.isoformat(),
            "fundraiser": {
                "id": str(f.id),
                "title": f.title,
                "public_slug": f.public_slug,
            } if f else None,
        })

    return jsonify(items), 200


@contributions_bp.route("/payments/pix/webhook", methods=["POST"])
def pix_forwarded_webhook():
    """
    Endpoint chamado pelo PIX-Module quando o PSP notifica um pagamento.
    Segurança: HMAC (cabeçalhos X-Signature e X-Timestamp) com segredo compartilhado.
    Payload esperado: {"txid": "...", "new_status": "CONCLUDED"|"ACTIVE"|...}
    """
    raw = request.get_data()
    sig = request.headers.get("X-Signature", "")
    ts = request.headers.get("X-Timestamp", "")

    if not current_app.payment_service.verify_webhook(raw, sig, ts):
        return jsonify({"error": "signature_verification_failed"}), 401

    try:
        body = request.get_json(force=True) or {}
    except Exception:
        return jsonify({"error": "invalid_json"}), 400

    txid = body.get("txid")
    new_status = (body.get("new_status") or "").upper()
    if not txid or not new_status:
        return jsonify({"error": "invalid_request"}), 400

    if new_status == "CONCLUDED":
        mapped = PaymentStatus.PAID
    elif new_status in ("REMOVED_BY_USER", "REMOVED_BY_PSP"):
        mapped = PaymentStatus.FAILED
    else:
        mapped = PaymentStatus.PENDING

    c = Contribution.query.filter_by(payment_intent_id=txid).with_for_update(nowait=False).first()
    if not c:
        return jsonify({"error": "not_found"}), 404

    prev = c.payment_status
    if prev != mapped:
        c.payment_status = mapped
        db.session.add(c)

        if mapped == PaymentStatus.PAID and prev != PaymentStatus.PAID:
            f = Fundraiser.query.get(c.fundraiser_id)
            f.current_amount = (f.current_amount or 0) + c.amount
            db.session.add(f)

        db.session.commit()

    return jsonify({"status": "ok", "txid": txid, "new_status": mapped.value})


@contributions_bp.route("/payments/<txid>/refresh", methods=["POST"])
def refresh_payment(txid: str):
    try:
        data = current_app.payment_service.fetch_status(txid)
    except Exception as e:
        return jsonify({"error": "fetch_failed", "message": str(e)}), 400
    if data.get("not_found"):
        return jsonify({"error": "not_found"}), 404

    psp_status = str(data.get("status") or "").strip().upper()

    # Aceita variações do PSP
    if psp_status in ("CONCLUDED", "CONCLUIDA", "CONCLUÍDA"):
        mapped = PaymentStatus.PAID
    elif psp_status in ("REMOVED_BY_USER", "REMOVIDA_PELO_USUARIO_RECEBEDOR",
                        "REMOVED_BY_PSP", "REMOVIDA_PELO_PSP"):
        mapped = PaymentStatus.FAILED
    else:
        mapped = PaymentStatus.PENDING

    c = Contribution.query.filter_by(payment_intent_id=txid).with_for_update().first()
    if not c:
        return jsonify({"error": "not_found"}), 404

    prev = c.payment_status
    if prev != mapped:
        c.payment_status = mapped
        db.session.add(c)
        if mapped == PaymentStatus.PAID and prev != PaymentStatus.PAID:
            f = Fundraiser.query.get(c.fundraiser_id)
            f.current_amount = (f.current_amount or 0) + c.amount
            db.session.add(f)
        db.session.commit()

    return jsonify({"txid": txid, "status": c.payment_status.value})
