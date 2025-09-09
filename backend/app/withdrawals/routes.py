import uuid
import os, hashlib, secrets
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request, g, current_app
from flask_jwt_extended import jwt_required
from sqlalchemy import func, and_, or_

from ..extensions import db
from ..decorators import tenant_required
from ..models import (
    User, Fundraiser, Contribution, PaymentStatus,
    BankAccount, Withdrawal, WithdrawalStatus,
    Invoice
)
from ..email_sender import (
    send_email_html_mailgun,
    build_withdrawal_email_html_admin,
    build_withdrawal_email_html_user,
)

withdrawals_bp = Blueprint("withdrawals", __name__)

APP_BACKEND_URL = os.getenv("APP_BACKEND_URL", "http://localhost:5055")
APP_FRONTEND_URL = os.getenv("APP_FRONTEND_URL", "http://localhost:5199")
PAYOUT_TOKEN_EXP_HOURS = int(os.getenv("PAYOUT_TOKEN_EXP_HOURS", "48"))
PAYOUT_TOKEN_MAX_VIEWS = int(os.getenv("PAYOUT_TOKEN_MAX_VIEWS", "5"))
INVOICE_TAX_RATE_PERCENT = Decimal(os.getenv("INVOICE_TAX_RATE_PERCENT", "5"))

def _new_payout_token():
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash

def _payout_url(token: str) -> str:
    return f"{APP_BACKEND_URL}/api/public/withdrawals/{token}"

def _dec(v) -> Decimal:
    if v is None:
        return Decimal("0")
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))

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
            "account_type": ba.account_type.value if ba and ba.account_type else None,
            "account_holder_name": ba.account_holder_name if ba else None,
        },
    }

def _sum_paid_contributions(fundraiser_id) -> Decimal:
    total = db.session.query(func.coalesce(func.sum(Contribution.amount), 0))\
        .filter(
            Contribution.fundraiser_id == fundraiser_id,
            Contribution.payment_status == PaymentStatus.PAID
        ).scalar()
    return _dec(total)

def _sum_withdrawals_non_failed(fundraiser_id) -> Decimal:
    total = db.session.query(func.coalesce(func.sum(Withdrawal.amount), 0))\
        .filter(
            Withdrawal.fundraiser_id == fundraiser_id,
            Withdrawal.status.in_([WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING, WithdrawalStatus.COMPLETED])
        ).scalar()
    return _dec(total)

def _sum_withdrawals_completed(fundraiser_id) -> Decimal:
    total = db.session.query(func.coalesce(func.sum(Withdrawal.amount), 0))\
        .filter(
            Withdrawal.fundraiser_id == fundraiser_id,
            Withdrawal.status == WithdrawalStatus.COMPLETED
        ).scalar()
    return _dec(total)

def _available_balance(fundraiser_id) -> Decimal:
    return _sum_paid_contributions(fundraiser_id) - _sum_withdrawals_non_failed(fundraiser_id)

def _quantize_money(v: Decimal) -> Decimal:
    return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def _ensure_invoice_for_withdrawal(w: Withdrawal) -> Invoice:
    inv: Invoice | None = db.session.query(Invoice).filter_by(withdrawal_id=w.id).first()
    if inv:
        return inv

    amount = _dec(w.amount)
    tax = _quantize_money((amount * INVOICE_TAX_RATE_PERCENT) / Decimal("100")) if INVOICE_TAX_RATE_PERCENT > 0 else Decimal("0.00")

    inv = Invoice(
        withdrawal_id=w.id,
        fundraiser_id=w.fundraiser_id,
        amount=_quantize_money(amount),
        tax_amount=_quantize_money(tax),
        issued_at=datetime.utcnow(),
        pdf_url=None,  # preencha quando você gerar o PDF
    )
    db.session.add(inv)
    db.session.commit()
    return inv


@withdrawals_bp.route("", methods=["POST"])
@jwt_required()
@tenant_required
def request_withdrawal():
    data = request.get_json() or {}
    fundraiser_id = data.get("fundraiser_id")
    bank_account_id = data.get("bank_account_id")
    amount = data.get("amount")
    description = (data.get("description") or "").strip() or None

    if not fundraiser_id or not bank_account_id or amount is None:
        return jsonify({"error": "invalid_request", "message": "Campos obrigatórios: fundraiser_id, bank_account_id, amount"}), 400

    try:
        amount_dec = _dec(amount)
    except Exception:
        return jsonify({"error": "invalid_amount"}), 400
    if amount_dec <= 0:
        return jsonify({"error": "invalid_amount"}), 400

    f: Fundraiser = Fundraiser.query.get(fundraiser_id)
    if not f or str(f.owner_user_id) != str(g.tenant_id):
        return jsonify({"error": "not_found", "message": "Arrecadação não encontrada"}), 404

    ba: BankAccount = BankAccount.query.get(bank_account_id)
    if not ba or str(ba.owner_user_id) != str(g.tenant_id):
        return jsonify({"error": "invalid_bank_account"}), 400

    avail = _available_balance(f.id)
    if amount_dec > avail:
        return jsonify({
            "error": "insufficient_funds",
            "message": "Valor solicitado excede o saldo disponível",
            "available_balance": float(avail)
        }), 422

    w = Withdrawal(
        fundraiser_id=f.id,
        bank_account_id=ba.id,
        amount=amount_dec,
        description=description,
        status=WithdrawalStatus.PENDING,
        requested_at=datetime.utcnow(),
    )
    db.session.add(w)
    db.session.commit()

    token, token_hash = _new_payout_token()
    w.payout_token_hash = token_hash
    w.payout_token_expires_at = datetime.utcnow() + timedelta(hours=PAYOUT_TOKEN_EXP_HOURS)
    w.payout_token_views = 0
    w.payout_token_max_views = PAYOUT_TOKEN_MAX_VIEWS
    db.session.add(w)
    db.session.commit()

    payout_url = _payout_url(token)

    try:
        requester: User | None = db.session.get(User, g.user_id)
        f: Fundraiser | None = db.session.get(Fundraiser, w.fundraiser_id)
        ba: BankAccount | None = db.session.get(BankAccount, w.bank_account_id)

        bank_info = {
            "bank_name": getattr(ba, "bank_name", None),
            "bank_code": getattr(ba, "bank_code", None),
            "agency": getattr(ba, "agency", None),
            "account_number": getattr(ba, "account_number", None),
            "account_type": ba.account_type.value if getattr(ba, "account_type", None) else None,
            "account_holder_name": getattr(ba, "account_holder_name", None),
        }

        control_url = f"{APP_FRONTEND_URL}/app/fundraisers/{f.id}/control" if f else None

        notify_to = os.getenv("WITHDRAWALS_NOTIFY_TO", "admin").strip()
        if notify_to:
            admin_html = build_withdrawal_email_html_admin(
                requester_name=requester.name if requester else "Usuário",
                requester_email=requester.email if requester else "",
                fundraiser_title=f.title if f else "(Arrecadação)",
                amount=w.amount,
                bank_info=bank_info,
                requested_at=w.requested_at,
                control_url=control_url,
                payout_url=payout_url,
            )
            for addr in [x.strip() for x in notify_to.split(",") if x.strip()]:
                send_email_html_mailgun(addr, f"[Saque] Novo pedido — {f.title if f else ''}", admin_html)

        if os.getenv("SEND_WITHDRAWAL_CONFIRM_TO_USER", "true").lower() in ("1", "true", "yes", "y"):
            user_html = build_withdrawal_email_html_user(
                requester_name=requester.name if requester else "Usuário",
                fundraiser_title=f.title if f else "(Arrecadação)",
                amount=w.amount,
                bank_info=bank_info,
                requested_at=w.requested_at,
                control_url=control_url,
            )
            if requester and requester.email:
                send_email_html_mailgun(requester.email, f"Recebemos seu pedido de saque — {f.title if f else ''}", user_html)

    except Exception as e:
        print(f"")
        current_app.logger.exception("Falha ao enviar e-mails de saque")
    
    return jsonify(_serialize_withdrawal(w)), 201


@withdrawals_bp.route("", methods=["GET"])
@jwt_required()
@tenant_required
def list_withdrawals():
    items = db.session.query(Withdrawal)\
        .join(Fundraiser, Fundraiser.id == Withdrawal.fundraiser_id)\
        .filter(Fundraiser.owner_user_id == g.tenant_id)\
        .order_by(Withdrawal.requested_at.desc())\
        .all()
    return jsonify([_serialize_withdrawal(w) for w in items]), 200

@withdrawals_bp.route("/<uuid:withdrawal_id>/status", methods=["PATCH"])
@jwt_required()
@tenant_required
def update_withdrawal_status(withdrawal_id):
    """
    Atualiza o status de um saque do usuário atual.
    Dispara criação de Invoice quando status muda para COMPLETED.
    Body esperado: {"status": "PENDING|PROCESSING|COMPLETED|FAILED", "processed_at": "ISO opcional"}
    """
    data = request.get_json() or {}
    new_status_str = (data.get("status") or "").strip().upper()
    if new_status_str not in {"PENDING", "PROCESSING", "COMPLETED", "FAILED"}:
        return jsonify({"error": "invalid_status"}), 400

    # Saque precisa pertencer a uma Arrecadação do tenant atual
    w: Withdrawal | None = (
        db.session.query(Withdrawal)
        .join(Fundraiser, Fundraiser.id == Withdrawal.fundraiser_id)
        .filter(
            Withdrawal.id == withdrawal_id,
            Fundraiser.owner_user_id == g.tenant_id,
        )
        .first()
    )
    if not w:
        return jsonify({"error": "not_found", "message": "Saque não encontrado"}), 404

    try:
        new_status = WithdrawalStatus[new_status_str]
    except KeyError:
        return jsonify({"error": "invalid_status"}), 400

    w.status = new_status

    # processed_at informado manualmente (opcional)
    processed_at_str = (data.get("processed_at") or "").strip()
    if processed_at_str:
        try:
            w.processed_at = datetime.fromisoformat(processed_at_str)
        except Exception:
            return jsonify({"error": "invalid_processed_at", "message": "processed_at deve ser ISO-8601"}), 400
    else:
        # Se marcou COMPLETED e ainda não tem processed_at, define agora
        if new_status == WithdrawalStatus.COMPLETED and not w.processed_at:
            w.processed_at = datetime.utcnow()

    db.session.add(w)
    db.session.commit()

    # Se COMPLETED, garantir Invoice criada
    if w.status == WithdrawalStatus.COMPLETED:
        try:
            _ensure_invoice_for_withdrawal(w)
        except Exception:
            current_app.logger.exception("Falha ao criar Invoice para o saque %s", w.id)

    return jsonify(_serialize_withdrawal(w)), 200

