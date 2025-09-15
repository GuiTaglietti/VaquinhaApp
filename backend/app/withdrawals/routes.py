# app/withdrawals/routes.py
import uuid
import os, hashlib, secrets
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request, g, current_app, make_response
from flask_jwt_extended import jwt_required
from sqlalchemy import func

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
from ..utils import notify_admin_webhook

withdrawals_bp = Blueprint("withdrawals", __name__)

APP_BACKEND_URL = os.getenv("APP_BACKEND_URL", "http://localhost:5055")
APP_FRONTEND_URL = os.getenv("APP_FRONTEND_URL", "http://localhost:5199")
PAYOUT_TOKEN_EXP_HOURS = int(os.getenv("PAYOUT_TOKEN_EXP_HOURS", "48"))
PAYOUT_TOKEN_MAX_VIEWS = int(os.getenv("PAYOUT_TOKEN_MAX_VIEWS", "5"))
FEE_MAINTENANCE_PERCENT = Decimal(os.getenv("FEE_MAINTENANCE_PERCENT", "4.99"))   # %
FEE_PER_DONATION = Decimal(os.getenv("FEE_PER_DONATION", "0.49"))                 # R$
FEE_WITHDRAWAL_FIXED = Decimal(os.getenv("FEE_WITHDRAWAL_FIXED", "4.50"))         # R$
INVOICE_TAX_RATE_PERCENT = Decimal(os.getenv("INVOICE_TAX_RATE_PERCENT", "5"))

def _new_payout_token():
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return token, token_hash

def _payout_url(token: str) -> str:
    return f"{APP_BACKEND_URL}/api/withdrawals/p/{token}"

def _dec(v) -> Decimal:
    if v is None:
        return Decimal("0")
    if isinstance(v, Decimal):
        return v
    return Decimal(str(v))

def _q(v: Decimal) -> Decimal:
    return v.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def _serialize_withdrawal(w: Withdrawal):
    ba = w.bank_account
    return {
        "id": str(w.id),
        "fundraiser_id": str(w.fundraiser_id),
        "bank_account_id": str(w.bank_account_id),
        "amount": float(_q(_dec(w.amount))),
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

# ---------------------- HELPERs de saldo com taxas ----------------------

def _paid_contributions_stats(fundraiser_id):
    """
    Retorna (total_grosso_recebido, quantidade_doacoes_pagas)
    """
    total, count = (
        db.session.query(
            func.coalesce(func.sum(Contribution.amount), 0),
            func.count(Contribution.id),
        )
        .filter(
            Contribution.fundraiser_id == fundraiser_id,
            Contribution.payment_status == PaymentStatus.PAID,
        )
        .one()
    )
    return _dec(total), int(count)

def _net_received_from_paid(fundraiser_id) -> dict:
    """
    Calcula o valor líquido recebido (após taxas de manutenção % e taxa fixa por doação).
    Não considera saques.
    """
    gross, count = _paid_contributions_stats(fundraiser_id)
    fee_maintenance = _q((gross * FEE_MAINTENANCE_PERCENT) / Decimal("100"))
    fee_per_donation_total = _q(FEE_PER_DONATION * Decimal(count))
    net_before_withdrawals = _q(gross - fee_maintenance - fee_per_donation_total)
    if net_before_withdrawals < Decimal("0.00"):
        net_before_withdrawals = Decimal("0.00")
    return {
        "gross_paid": _q(gross),
        "paid_count": count,
        "fee_maintenance_percent": float(FEE_MAINTENANCE_PERCENT),
        "fee_maintenance_amount": _q(fee_maintenance),
        "fee_per_donation": _q(FEE_PER_DONATION),
        "fee_per_donation_total": _q(fee_per_donation_total),
        "net_before_withdrawals": _q(net_before_withdrawals),
    }

def _sum_withdrawals_non_failed_amount_and_count(fundraiser_id):
    """
    Soma os saques PENDING/PROCESSING/COMPLETED (não-FAILED).
    Retorna (soma_valores, quantidade_saques).
    """
    total, count = (
        db.session.query(
            func.coalesce(func.sum(Withdrawal.amount), 0),
            func.count(Withdrawal.id),
        )
        .filter(
            Withdrawal.fundraiser_id == fundraiser_id,
            Withdrawal.status.in_([WithdrawalStatus.PENDING, WithdrawalStatus.PROCESSING, WithdrawalStatus.COMPLETED]),
        )
        .one()
    )
    return _dec(total), int(count)

def _available_balance_net(fundraiser_id) -> dict:
    """
    Saldo líquido disponível para saque considerando:
    - total de contribuições pagas líquido de taxas (manutenção% + fixa por doação)
    - menos saques já realizados/pendentes
    - e contabilizando as taxas fixas de saque já incorridas (1 por saque não-FAILED)
    Não subtrai a taxa do PRÓXIMO saque ainda (isso é calculado separadamente).
    """
    base = _net_received_from_paid(fundraiser_id)
    withdrawals_sum, withdrawals_count = _sum_withdrawals_non_failed_amount_and_count(fundraiser_id)
    withdrawals_fees_total = _q(FEE_WITHDRAWAL_FIXED * Decimal(withdrawals_count))

    available_before_next_withdraw_fee = _q(base["net_before_withdrawals"] - withdrawals_sum - withdrawals_fees_total)
    if available_before_next_withdraw_fee < Decimal("0.00"):
        available_before_next_withdraw_fee = Decimal("0.00")

    max_payout_now_after_fee = _q(available_before_next_withdraw_fee - FEE_WITHDRAWAL_FIXED)
    if max_payout_now_after_fee < Decimal("0.00"):
        max_payout_now_after_fee = Decimal("0.00")

    return {
        **base,
        "withdrawals_sum_non_failed": _q(withdrawals_sum),
        "withdrawals_count_non_failed": withdrawals_count,
        "withdraw_fee_fixed": _q(FEE_WITHDRAWAL_FIXED),
        "withdraw_fees_total_applied": _q(withdrawals_fees_total),
        "available_net_before_withdraw_fee": _q(available_before_next_withdraw_fee),
        "max_payout_now_after_withdraw_fee": _q(max_payout_now_after_fee),
    }

# ---------------------- END HELPERs ----------------------


def _ensure_invoice_for_withdrawal(w: Withdrawal) -> Invoice:
    inv: Invoice | None = (
        db.session.query(Invoice).filter_by(withdrawal_id=w.id).first()
    )
    if inv:
        return inv

    amount = _dec(w.amount)
    withdrawal_fee = _q(FEE_WITHDRAWAL_FIXED)

    tax = withdrawal_fee if withdrawal_fee <= amount else _q(amount)

    inv = Invoice(
        withdrawal_id=w.id,
        fundraiser_id=w.fundraiser_id,
        amount=_q(amount),
        tax_amount=_q(tax),
        issued_at=datetime.utcnow(),
        pdf_url=None,
    )
    db.session.add(inv)
    db.session.commit()
    return inv



@withdrawals_bp.route("/available/<uuid:fundraiser_id>", methods=["GET"])
@jwt_required()
@tenant_required
def get_available_balance(fundraiser_id):
    """
    Retorna os números para o usuário enxergar o saldo disponível (líquido) para saque,
    já com taxas aplicadas.
    """
    f: Fundraiser | None = Fundraiser.query.get(fundraiser_id)
    if not f or str(f.owner_user_id) != str(g.tenant_id):
        return jsonify({"error": "not_found", "message": "Arrecadação não encontrada"}), 404

    calc = _available_balance_net(f.id)
    # Serializa Decimals para float
    resp = {
        "fundraiser_id": str(f.id),
        "gross_paid": float(calc["gross_paid"]),
        "paid_count": calc["paid_count"],
        "fee_maintenance_percent": calc["fee_maintenance_percent"],
        "fee_maintenance_amount": float(calc["fee_maintenance_amount"]),
        "fee_per_donation": float(calc["fee_per_donation"]),
        "fee_per_donation_total": float(calc["fee_per_donation_total"]),
        "net_before_withdrawals": float(calc["net_before_withdrawals"]),
        "withdrawals_sum_non_failed": float(calc["withdrawals_sum_non_failed"]),
        "withdrawals_count_non_failed": calc["withdrawals_count_non_failed"],
        "withdraw_fee_fixed": float(calc["withdraw_fee_fixed"]),
        "withdraw_fees_total_applied": float(calc["withdraw_fees_total_applied"]),
        "available_net_before_withdraw_fee": float(calc["available_net_before_withdraw_fee"]),
        "max_payout_now_after_withdraw_fee": float(calc["max_payout_now_after_withdraw_fee"]),
    }
    return jsonify(resp), 200


@withdrawals_bp.route("", methods=["POST"])
@jwt_required()
@tenant_required
def request_withdrawal():
    """
    Cria um pedido de saque.
    Valida contra o SALDO LÍQUIDO e notifica o Admin BE via webhook para SSE.
    """
    data = request.get_json() or {}
    fundraiser_id = data.get("fundraiser_id")
    bank_account_id = data.get("bank_account_id")
    amount = data.get("amount")
    description = (data.get("description") or "").strip() or None

    if not fundraiser_id or not bank_account_id or amount is None:
        return jsonify({"error": "invalid_request", "message": "Campos obrigatórios: fundraiser_id, bank_account_id, amount"}), 400


    try:
        amount_dec = _q(_dec(amount))
    except Exception:
        return jsonify({"error": "invalid_amount"}), 400
    if amount_dec < Decimal("50.00"):
        return jsonify({"error": "invalid_amount"}), 400

    f: Fundraiser | None = Fundraiser.query.get(fundraiser_id)
    if not f or str(f.owner_user_id) != str(g.tenant_id):
        return jsonify({"error": "not_found", "message": "Arrecadação não encontrada"}), 404

    ba: BankAccount | None = BankAccount.query.get(bank_account_id)
    if not ba or str(ba.owner_user_id) != str(g.tenant_id):
        return jsonify({"error": "invalid_bank_account"}), 400

    # >>> Saldo líquido disponível (com taxas) <<<
    calc = _available_balance_net(f.id)
    available_net_before_fee = calc["available_net_before_withdraw_fee"]
    max_payout_after_fee = calc["max_payout_now_after_withdraw_fee"]

    # amount = valor líquido a receber -> não pode exceder o máximo após taxa fixa de saque
    if amount_dec > max_payout_after_fee:
        return jsonify({
            "error": "insufficient_funds",
            "message": "Valor solicitado excede o saldo disponível líquido para saque (já considerando taxas).",
            "available_net_before_withdraw_fee": float(_q(available_net_before_fee)),
            "withdraw_fee_fixed": float(_q(FEE_WITHDRAWAL_FIXED)),
            "max_payout_now_after_withdraw_fee": float(_q(max_payout_after_fee)),
        }), 422

    # Cria o saque
    w = Withdrawal(
        fundraiser_id=f.id,
        bank_account_id=ba.id,
        amount=amount_dec,  # valor líquido ao usuário
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
        notify_admin_webhook(
            "/webhooks/withdrawal-requested",
            {"withdrawal_id": str(w.id)}
        )
    except Exception:
        pass

    try:
        requester: User | None = db.session.get(User, g.user_id)
        f_db: Fundraiser | None = db.session.get(Fundraiser, w.fundraiser_id)
        ba_db: BankAccount | None = db.session.get(BankAccount, w.bank_account_id)

        bank_info = {
            "bank_name": getattr(ba_db, "bank_name", None),
            "bank_code": getattr(ba_db, "bank_code", None),
            "agency": getattr(ba_db, "agency", None),
            "account_number": getattr(ba_db, "account_number", None),
            "account_type": ba_db.account_type.value if getattr(ba_db, "account_type", None) else None,
            "account_holder_name": getattr(ba_db, "account_holder_name", None),
        }

        public_url = None
        if f_db and getattr(f_db, "public_slug", None):
            public_url = f"{APP_FRONTEND_URL}/p/{f_db.public_slug}"
        control_url = public_url or (f"{APP_FRONTEND_URL}/app/fundraisers/{f_db.id}/control" if f_db else None)

        notify_to = os.getenv("WITHDRAWALS_NOTIFY_TO", "admin").strip()
        if notify_to:
            admin_html = build_withdrawal_email_html_admin(
                requester_name=requester.name if requester else "Usuário",
                requester_email=requester.email if requester else "",
                fundraiser_title=f_db.title if f_db else "(Arrecadação)",
                amount=w.amount,
                bank_info=bank_info,
                requested_at=w.requested_at,
                control_url=control_url,
                payout_url=payout_url,
            )
            for addr in [x.strip() for x in notify_to.split(",") if x.strip()]:
                send_email_html_mailgun(addr, f"[Saque] Novo pedido — {f_db.title if f_db else ''}", admin_html)

        if os.getenv("SEND_WITHDRAWAL_CONFIRM_TO_USER", "true").lower() in ("1", "true", "yes", "y"):
            user_html = build_withdrawal_email_html_user(
                requester_name=requester.name if requester else "Usuário",
                fundraiser_title=f_db.title if f_db else "(Arrecadação)",
                amount=w.amount,
                bank_info=bank_info,
                requested_at=w.requested_at,
                control_url=control_url,
            )
            if requester and requester.email:
                send_email_html_mailgun(requester.email, f"Recebemos seu pedido de saque — {f_db.title if f_db else ''}", user_html)

    except Exception:
        current_app.logger.exception("Falha ao enviar e-mails de saque")

    return jsonify(_serialize_withdrawal(w)), 201



@withdrawals_bp.route("", methods=["GET"])
@jwt_required()
@tenant_required
def list_withdrawals():
    items = (
        db.session.query(Withdrawal)
        .join(Fundraiser, Fundraiser.id == Withdrawal.fundraiser_id)
        .filter(Fundraiser.owner_user_id == g.tenant_id)
        .order_by(Withdrawal.requested_at.desc())
        .all()
    )
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


# ---------------------- PÁGINA PÚBLICA DO TOKEN DE PAGAMENTO ----------------------
@withdrawals_bp.route("/p/<token>", methods=["GET"])
def view_payout_token(token: str):
    """
    Página simples (HTML) para o admin visualizar/copiar os dados bancários do saque.
    - Expira por tempo (payout_token_expires_at) ou por número de views (payout_token_max_views).
    - Incrementa o contador de visualizações em cada acesso válido.
    """
    if not token or len(token) < 10:
        return _simple_html("Link inválido ou expirado.", ok=False), 404

    token_hash = hashlib.sha256(token.encode()).hexdigest()

    w: Withdrawal | None = db.session.query(Withdrawal).filter_by(payout_token_hash=token_hash).first()
    if not w:
        return _simple_html("Link inválido ou expirado.", ok=False), 404

    # Verificações de expiração/limite de views
    now = datetime.utcnow()
    if (w.payout_token_expires_at and now > w.payout_token_expires_at) or \
       (w.payout_token_max_views is not None and w.payout_token_views is not None and w.payout_token_views >= w.payout_token_max_views):
        return _simple_html("Este link expirou. Solicite um novo.", ok=False), 410

    # Incrementa visualizações
    try:
        w.payout_token_views = (w.payout_token_views or 0) + 1
        db.session.add(w)
        db.session.commit()
    except Exception:
        current_app.logger.exception("Falha ao incrementar views do payout token")

    ba: BankAccount | None = db.session.get(BankAccount, w.bank_account_id)
    f: Fundraiser | None = db.session.get(Fundraiser, w.fundraiser_id)

    if not ba:
        return _simple_html("Conta bancária não encontrada.", ok=False), 404

    # Monta bloco copiável com dados COMPLETOS
    bank_name = (getattr(ba, "bank_name", "") or "").strip() or "-"
    bank_code = (getattr(ba, "bank_code", "") or "").strip() or "-"
    agency = (getattr(ba, "agency", "") or "").strip() or "-"
    account_number = (getattr(ba, "account_number", "") or "").strip() or "-"
    account_type = getattr(ba, "account_type", None)
    account_holder_name = (getattr(ba, "account_holder_name", "") or "").strip() or "-"
    document_number = (getattr(ba, "document_number", "") or "").strip() or "-"

    full_copy_block = "\n".join([
        f"Banco: {bank_name} ({bank_code})",
        f"Agência: {agency}",
        f"Conta: {account_number}",
        f"Tipo: {str(account_type.value).title() if account_type else '-'}",
        f"Titular: {account_holder_name}",
        f"Documento: {document_number}",
    ])

    title = f"Dados bancários — {f.title if f else 'Arrecadação'}"
    subtitle = f"Pedido de saque feito em {w.requested_at.strftime('%d/%m/%Y %H:%M')} (UTC)"
    hint = f"Este link expira em {w.payout_token_expires_at.strftime('%d/%m/%Y %H:%M')} (UTC)" if w.payout_token_expires_at else ""
    views_info = f"Visualizações: {w.payout_token_views}/{w.payout_token_max_views or '∞'}"

    body = f"""
<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<style>
  :root {{
    --brand:#1e90a3; --border:#e5e7eb; --muted:#6b7280; --danger:#c0392b;
  }}
  body {{
    font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
    background: #f3f4f6; color: #111827; margin: 0; padding: 24px;
  }}
  .card {{
    max-width: 720px; margin: 0 auto; background: #fff; border: 1px solid var(--border);
    border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,.08); padding: 20px;
  }}
  h1 {{ font-size: 18px; margin: 0 0 6px 0; color: var(--brand); }}
  p  {{ margin: 6px 0; color: #374151; }}
  .muted {{ color: var(--muted); font-size: 13px; }}
  .row {{ display:flex; gap: 8px; margin: 6px 0; }}
  .col {{ flex:1; border:1px solid var(--border); border-radius:10px; padding:10px; background:#fff; }}
  pre {{ background:#f8fafc; border:1px solid var(--border); border-radius:10px; padding:12px; white-space:pre-wrap; }}
  .btn {{
    display:inline-block; padding:10px 14px; border-radius:10px; border:1px solid var(--border);
    background:#111827; color:#fff; text-decoration:none; font-size:14px; cursor:pointer;
  }}
  .btn.secondary {{ background:#fff; color:#111827; }}
  .grid {{ display:grid; grid-template-columns: 1fr 1fr; gap:10px }}
  .footer {{ margin-top: 12px; color: var(--muted); font-size: 12px }}
</style>
<body>
  <div class="card">
    <h1>{title}</h1>
    <p class="muted">{subtitle}</p>
    <div class="grid" style="margin:10px 0 6px 0">
      <div class="col"><strong>Banco</strong><br>{bank_name} {f"({bank_code})" if bank_code and bank_code != "-" else ""}</div>
      <div class="col"><strong>Agência</strong><br>{agency}</div>
      <div class="col"><strong>Conta</strong><br>{account_number}</div>
      <div class="col"><strong>Tipo</strong><br>{str(account_type.value).title() if account_type else "-"}</div>
      <div class="col"><strong>Titular</strong><br>{account_holder_name}</div>
      <div class="col"><strong>Documento</strong><br>{document_number}</div>
    </div>

    <p class="muted">Bloco completo para copiar/colar:</p>
    <pre id="copyBlock">{full_copy_block}</pre>

    <div class="footer">
      {hint}<br>{views_info}
    </div>
  </div>

<script>
function copyBlock() {{
  const el = document.getElementById('copyBlock');
  const text = el ? el.innerText : '';
  navigator.clipboard.writeText(text).then(() => {{
    alert('Copiado!');
  }}).catch(() => {{
    alert('Falha ao copiar, selecione o texto manualmente.');
  }});
}}
</script>
</body></html>
"""
    resp = make_response(body, 200)
    resp.headers["Content-Type"] = "text/html; charset=utf-8"
    return resp

def _simple_html(msg: str, ok: bool = True):
    color = "#1e90a3" if ok else "#c0392b"
    body = f"""
<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<title>Link de saque</title>
<body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,'Noto Sans',sans-serif;
             background:#f3f4f6;color:#111827;margin:0;padding:24px">
  <div style="max-width:560px;margin:56px auto;background:white;padding:28px;border-radius:12px;
              border:1px solid #e5e7eb;box-shadow:0 8px 30px rgba(0,0,0,.08)">
    <h2 style="margin:0 0 12px 0;color:{color}">Velório Solidário</h2>
    <p style="font-size:16px;line-height:1.6;margin:0;">{msg}</p>
  </div>
</body></html>
"""
    resp = make_response(body, 200 if ok else 410)
    resp.headers["Content-Type"] = "text/html; charset=utf-8"
    return resp
