import os
import hashlib

from flask import Blueprint, jsonify, make_response
from sqlalchemy.orm import joinedload
from ..extensions import db
from ..models import Withdrawal, BankAccount, Fundraiser, User, Contribution, FundraiserStatus
from ..utils import validate_audit_token
from datetime import datetime

public_bp = Blueprint("public", __name__)


@public_bp.route("/p/<public_slug>", methods=["GET"])
def get_public_fundraiser(public_slug):
    """Retorna dados públicos de uma vaquinha através do slug."""
    fundraiser = Fundraiser.query.filter_by(public_slug=public_slug, is_public=True).first()
    if not fundraiser:
        return jsonify({"error": "not_found"}), 404

    if fundraiser.status == FundraiserStatus.PAUSED:
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
        "status": fundraiser.status.value,
        "is_public": fundraiser.is_public,
        "public_slug": fundraiser.public_slug,
        "can_contribute": fundraiser.status == FundraiserStatus.ACTIVE,
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

def _simple_html(msg: str, ok: bool = True):
    color = "#1e90a3" if ok else "#c0392b"
    body = f"""
    <!doctype html><html lang="pt-BR"><meta charset="utf-8">
    <title>Detalhes do Saque</title>
    <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,'Noto Sans',sans-serif;
                 background:hsl(214 19% 94%);color:hsl(0 0% 11%);">
      <div style="max-width:720px;margin:56px auto;background:white;padding:28px;border-radius:12px;
                  border:1px solid hsl(214 19% 85%);box-shadow:0 8px 30px hsl(200 14% 31% / .15);">
        <h2 style="margin:0 0 12px 0;color:{color}">Velório Solidário</h2>
        <p style="font-size:16px;line-height:1.6;margin:0;">{msg}</p>
      </div>
    </body></html>
    """
    resp = make_response(body)
    resp.headers["Content-Type"] = "text/html; charset=utf-8"
    resp.headers["Cache-Control"] = "no-store"
    return resp

def _brl(v) -> str:
    try: n = float(v)
    except: return "R$ 0,00"
    s = f"{n:,.2f}"
    return "R$ " + s.replace(",", "X").replace(".", ",").replace("X", ".")

def _dt_br(dt: datetime | str | None) -> str:
    if not dt: return "-"
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return dt
    return dt.strftime("%d/%m/%Y %H:%M")

@public_bp.route("/p/withdrawals/<token>", methods=["GET"])
def public_withdrawal_view(token: str):
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    w: Withdrawal | None = Withdrawal.query.filter_by(payout_token_hash=token_hash).first()

    if not w:
        return _simple_html("Link inválido ou inexistente.", ok=False), 404
    if w.payout_token_expires_at and w.payout_token_expires_at < datetime.utcnow():
        return _simple_html("Link expirado. Solicite um novo link ao organizador.", ok=False), 410
    if w.payout_token_max_views and (w.payout_token_views or 0) >= w.payout_token_max_views:
        return _simple_html("Limite de visualizações excedido. Solicite um novo link ao organizador.", ok=False), 410

    w.payout_token_views = (w.payout_token_views or 0) + 1
    db.session.add(w)
    db.session.commit()

    f: Fundraiser | None = db.session.get(Fundraiser, w.fundraiser_id)
    ba: BankAccount | None = db.session.get(BankAccount, w.bank_account_id)
    owner: User | None = db.session.get(User, f.owner_user_id) if f else None


    bank_name = (ba.bank_name or "").strip() if ba else ""
    bank_code = (ba.bank_code or "").strip() if ba else ""
    agency = (ba.agency or "").strip() if ba else ""
    account_number = (ba.account_number or "").strip() if ba else ""
    account_type = (ba.account_type.value if getattr(ba, "account_type", None) else "").title()
    holder = (ba.account_holder_name or "").strip() if ba else ""

    html = f"""
<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<title>Dados para Pagamento — Velório Solidário</title>
<body style="margin:0;background:hsl(214 19% 94%);color:hsl(0 0% 11%);
             font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,'Noto Sans',sans-serif;">
  <div style="max-width:760px;margin:40px auto;background:white;border:1px solid hsl(214 19% 85%);
              border-radius:14px;box-shadow:0 8px 30px hsl(200 14% 31% / .15);overflow:hidden">
    <div style="padding:20px 24px;background:linear-gradient(135deg,hsl(200 14% 31%),hsl(147 23% 50%));color:white">
      <h1 style="margin:0;font-size:20px">Dados para Pagamento</h1>
      <p style="margin:6px 0 0 0;opacity:.95">Saque solicitado{' por ' + (owner.name if owner else 'Usuário') if owner else ''}</p>
    </div>

    <div style="padding:24px">
      <div style="border:1px solid hsl(214 19% 85%);border-radius:12px;padding:16px;background:hsl(214 19% 90% / .35);margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:hsl(200 14% 31%)">Arrecadação</span>
          <strong>{(f.title if f else '—')}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:hsl(200 14% 31%)">Valor do saque</span>
          <strong style="color:hsl(147 23% 35%)">{_brl(w.amount)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <span style="color:hsl(200 14% 31%)">Solicitado em</span>
          <span>{_dt_br(w.requested_at)} (UTC)</span>
        </div>
      </div>

      <h3 style="margin:18px 0 10px 0">Conta de destino</h3>
      <table style="width:100%;border-collapse:separate;border-spacing:0 8px">
        <tr>
          <td style="padding:10px 12px;border:1px solid hsl(214 19% 85%);border-radius:10px;background:hsl(0 0% 100%);">Banco</td>
          <td style="padding:10px 12px;border:1px solid hsl(214 19% 85%);border-radius:10px;background:hsl(0 0% 100%);text-align:right;">
            {bank_name} {f"({bank_code})" if bank_code else ""}
          </td>
        </tr>
        <tr>
          <td style="padding:10px 12px;border:1px solid hsl(214 19% 85%);border-radius:10px;background:hsl(0 0% 100%);">Agência</td>
          <td style="padding:10px 12px;border:1px solid hsl(214 19% 85%);border-radius:10px;background:hsl(0 0% 100%);text-align:right;">{agency}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;border:1px solid hsl(214 19% 85%);border-radius:10px;background:hsl(0 0% 100%);">Conta</td>
          <td style="padding:10px 12px;border:1px solid hsl(214 19% 85%);border-radius:10px;background:hsl(0 0% 100%);text-align:right;">{account_number}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;border:1px solid hsl(214 19% 85%);border-radius:10px;background:hsl(0 0% 100%);">Tipo</td>
          <td style="padding:10px 12px;border:1px solid hsl(214 19% 85%);border-radius:10px;background:hsl(0 0% 100%);text-align:right;">{account_type}</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;border:1px solid hsl(214 19% 85%);border-radius:10px;background:hsl(0 0% 100%);">Titular</td>
          <td style="padding:10px 12px;border:1px solid hsl(214 19% 85%);border-radius:10px;background:hsl(0 0% 100%);text-align:right;">{holder}</td>
        </tr>
      </table>

      <p style="margin:18px 0 0 0;color:hsl(200 14% 31%);font-size:12px">
        Este link é temporário e não deve ser compartilhado. Se você não reconhece este pedido, ignore este e-mail.
      </p>
    </div>
  </div>
</body></html>
    """

    resp = make_response(html)
    resp.headers["Content-Type"] = "text/html; charset=utf-8"
    resp.headers["Cache-Control"] = "no-store"
    return resp, 200