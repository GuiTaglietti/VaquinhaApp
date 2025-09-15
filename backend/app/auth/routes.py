# app/auth/routes.py
import uuid
import os
import secrets
from datetime import datetime, timedelta
from urllib.parse import urlencode
from werkzeug.exceptions import BadRequest, NotFound, Forbidden

from flask import Blueprint, request, jsonify, current_app, make_response, redirect
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
)

from ..extensions import db
from ..models import User, EmailVerification, PasswordReset, Fundraiser, Contribution, BankAccount, PaymentStatus
from ..utils import hash_password, verify_password, notify_admin_webhook
from ..email_sender import send_email_html_mailgun, build_verification_email_html
from ..decorators import tenant_required

from decimal import Decimal
from sqlalchemy import func, or_

from ..email_sender import (
    send_email_html_mailgun,
    build_verification_email_html,
    _css_vars,
    _email_shell,
    _as_str_amount,
    _mask,
    _fmt_dt_br,
)


auth_bp = Blueprint("auth", __name__)

CONFIRM_EXP_HOURS = int(os.getenv("CONFIRM_EXP_HOURS", "24"))
RESET_EXP_HOURS = int(os.getenv("RESET_EXP_HOURS", "2"))
APP_BACKEND_URL = os.getenv("APP_BACKEND_URL", "http://localhost:5055")
APP_FRONTEND_URL = os.getenv("APP_FRONTEND_URL", "http://localhost:5199")
ADMIN_REPORT_EMAILS = [e.strip() for e in os.getenv("ADMIN_REPORT_EMAILS", "").split(",") if e.strip()]

def _confirm_url(token: str) -> str:
    return f"{APP_BACKEND_URL}/api/auth/confirm/{token}"

def _front_confirm_redirect(status: str, email: str | None = None) -> str | None:
    if not APP_FRONTEND_URL:
        return None
    qs = {"status": status}
    if email:
        qs["email"] = email
    return f"{APP_FRONTEND_URL}/auth/confirm?{urlencode(qs)}"

def _build_delete_account_email_html_admin(
    user: User,
    total_amount: Decimal,
    bank: BankAccount,
    deleted_at: datetime,
) -> str:
    c = _css_vars()

    bank_name = (getattr(bank, "bank_name", "") or "").strip() or "-"
    bank_code = (getattr(bank, "bank_code", "") or "").strip() or "-"
    agency = (getattr(bank, "agency", "") or "").strip() or "-"
    account_number = (getattr(bank, "account_number", "") or "").strip() or "-"
    account_type = getattr(bank, "account_type", None)
    account_holder_name = (getattr(bank, "account_holder_name", "") or "").strip() or "-"
    document_number = (getattr(bank, "document_number", "") or "").strip() or "-"

    agency_masked = _mask(str(agency), keep_last=2) if agency != "-" else "-"
    account_masked = _mask(str(account_number), keep_last=4) if account_number != "-" else "-"
    doc_masked = _mask(str(document_number), keep_last=3) if document_number != "-" else "-"

    full_copy_block = "\n".join([
        f"Banco: {bank_name} ({bank_code})",
        f"Agência: {agency}",
        f"Conta: {account_number}",
        f"Tipo: {str(account_type).title() if account_type else '-'}",
        f"Titular: {account_holder_name}",
        f"Documento: {document_number}",
    ])

    body = f"""
<p style="margin:0 0 12px 0">Um usuário solicitou a <strong>exclusão da conta</strong>.</p>

<div style="border:1px solid {c['border']};border-radius:12px;padding:12px;background:#fff;margin:12px 0">
  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">Usuário</span>
    <strong>{(user.name or '-').strip()}</strong>
  </div>
  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">E-mail</span>
    <a href="mailto:{user.email}" style="color:{c['brand']};text-decoration:none">{user.email}</a>
  </div>
  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">ID</span>
    <span>{user.id}</span>
  </div>
  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">Excluído em</span>
    <span>{_fmt_dt_br(deleted_at)} (UTC)</span>
  </div>
</div>

<h3 style="margin:18px 0 8px 0;font-size:16px">Valor a depositar</h3>
<div style="border:1px solid {c['border']};border-radius:12px;padding:12px;background:#fff;margin:12px 0">
  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">Total das arrecadações do usuário</span>
    <strong style="color:{c['brand_dark']}">{_as_str_amount(total_amount)}</strong>
  </div>
</div>

<h3 style="margin:18px 0 8px 0;font-size:16px">Dados bancários para depósito (copiar/colar)</h3>
<pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid {c['border']};border-radius:10px;padding:12px;margin:8px 0">
{full_copy_block}
</pre>

<h3 style="margin:18px 0 8px 0;font-size:16px">Resumo dos dados (mascarado)</h3>
<table style="width:100%;border-collapse:separate;border-spacing:0 8px">
  <tr>
    <td style="padding:10px 12px;border:1px solid {c['border']};border-radius:10px;background:#fff;">Banco</td>
    <td style="padding:10px 12px;border:1px solid {c['border']};border-radius:10px;background:#fff;text-align:right;">
      {bank_name} {f"({bank_code})" if bank_code and bank_code != "-" else ""}
    </td>
  </tr>
  <tr>
    <td style="padding:10px 12px;border:1px solid {c['border']};border-radius:10px;background:#fff;">Agência</td>
    <td style="padding:10px 12px;border:1px solid {c['border']};border-radius:10px;background:#fff;text-align:right;">
      {agency_masked}
    </td>
  </tr>
  <tr>
    <td style="padding:10px 12px;border:1px solid {c['border']};border-radius:10px;background:#fff;">Conta</td>
    <td style="padding:10px 12px;border:1px solid {c['border']};border-radius:10px;background:#fff;text-align:right;">
      {account_masked}
    </td>
  </tr>
  <tr>
    <td style="padding:10px 12px;border:1px solid {c['border']};border-radius:10px;background:#fff;">Tipo</td>
    <td style="padding:10px 12px;border:1px solid {c['border']};border-radius:10px;background:#fff;text-align:right;">
      {str(account_type).title() if account_type else "-"}
    </td>
  </tr>
  <tr>
    <td style="padding:10px 12px;border:1px solid {c['border']};border-radius:10px;background:#fff;">Titular</td>
    <td style="padding:10px 12px;border:1px solid {c['border']};border-radius:10px;background:#fff;text-align:right;">
      {account_holder_name}
    </td>
  </tr>
  <tr>
    <td style="padding:10px 12px;border:1px solid {c['border']};border-radius:10px;background:#fff;">Documento</td>
    <td style="padding:10px 12px;border:1px solid {c['border']};border-radius:10px;background:#fff;text-align:right;">
      {doc_masked}
    </td>
  </tr>
</table>

<p style="margin:16px 0 0 0;color:{c['muted']};font-size:12px">
  Observação: o bloco acima contém os dados <strong>completos</strong> para depósito; a tabela apresenta uma visão mascarada.
</p>
"""
    return _email_shell("Conta excluída — Ação administrativa necessária", body)



@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not all([name, email, password]):
        return jsonify({"error": "invalid_request", "message": "Campos obrigatórios ausentes"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "user_exists", "message": "Email já cadastrado"}), 400

    EmailVerification.query.filter(
        EmailVerification.email == email,
        EmailVerification.used.is_(False),
    ).delete(synchronize_session=False)

    token = secrets.token_urlsafe(32)
    ev = EmailVerification(
        email=email,
        name=name,
        password_hash=hash_password(password),
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=CONFIRM_EXP_HOURS),
        used=False,
    )
    db.session.add(ev)
    db.session.commit()

    confirm_url = _confirm_url(token)
    subject = "Confirme seu e-mail — Velório Solidário"
    html = build_verification_email_html(name, confirm_url)

    try:
        send_email_html_mailgun(email, subject, html)
    except Exception:
        current_app.logger.exception("Falha ao enviar e-mail de confirmação")
        return jsonify({
            "message": "Cadastro iniciado, mas houve falha no envio do e-mail.",
            "dev_confirm_url": confirm_url
        }), 202

    return jsonify({"message": "Enviamos um e-mail para confirmar seu cadastro."}), 201


@auth_bp.route("/confirm/<token>", methods=["GET"])
def confirm_email(token):
    ev: EmailVerification | None = EmailVerification.query.filter_by(token=token).first()

    if not ev:
        url = _front_confirm_redirect("invalid", None)
        if url:
            return redirect(url, code=302)
        return _simple_html("Link inválido ou expirado.", ok=False), 400

    if ev.used:
        url = _front_confirm_redirect("already", ev.email)
        if url:
            return redirect(url, code=302)
        return _simple_html("Este link já foi utilizado. Você já pode fazer login."), 200

    if ev.expires_at < datetime.utcnow():
        url = _front_confirm_redirect("expired", ev.email)
        if url:
            return redirect(url, code=302)
        return _simple_html("Link expirado. Solicite um novo cadastro."), 400

    if User.query.filter_by(email=ev.email).first():
        ev.used = True
        db.session.commit()
        url = _front_confirm_redirect("already", ev.email)
        if url:
            return redirect(url, code=302)
        return _simple_html("E-mail já confirmado anteriormente. Faça login."), 200

    user = User(
        name=ev.name,
        email=ev.email,
        password_hash=ev.password_hash,
    )
    db.session.add(user)
    db.session.flush()

    if hasattr(User, "tenant_id"):
        user.tenant_id = user.id
        db.session.add(user)

    ev.used = True
    db.session.commit()

    url = _front_confirm_redirect("success", ev.email)
    if url:
        return redirect(url, code=302)
    return _simple_html("E-mail confirmado com sucesso. Você já pode fazer login."), 200


def _simple_html(msg: str, ok: bool = True):
    color = "#1e90a3" if ok else "#c0392b"
    body = f"""
    <!doctype html><html lang="pt-BR"><meta charset="utf-8">
    <title>Confirmação</title>
    <body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,'Noto Sans',sans-serif;
                 background:hsl(214 19% 94%);color:hsl(0 0% 11%);">
      <div style="max-width:560px;margin:56px auto;background:white;padding:28px;border-radius:12px;
                  border:1px solid hsl(214 19% 85%);box-shadow:0 8px 30px hsl(200 14% 31% / .15);">
        <h2 style="margin:0 0 12px 0;color:{color}">Velório Solidário</h2>
        <p style="font-size:16px;line-height:1.6;margin:0;">{msg}</p>
      </div>
    </body></html>
    """
    resp = make_response(body)
    resp.headers["Content-Type"] = "text/html; charset=utf-8"
    return resp


@auth_bp.route("/resend-confirmation", methods=["POST"])
def resend_confirmation():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    name = (data.get("name") or "").strip()

    if not email:
        return jsonify({"error": "invalid_request"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"message": "E-mail já confirmado. Faça login."}), 200

    ev = EmailVerification.query.filter(
        EmailVerification.email == email,
        EmailVerification.used.is_(False)
    ).order_by(EmailVerification.created_at.desc()).first()

    if not ev:
        return jsonify({"error": "not_found", "message": "Não há cadastro pendente para este e-mail."}), 404

    if ev.expires_at < datetime.utcnow():
        return jsonify({"error": "expired", "message": "Link expirado. Inicie o cadastro novamente."}), 400

    confirm_url = _confirm_url(ev.token)
    subject = "Confirme seu e-mail — Velório Solidário"
    html = build_verification_email_html(ev.name or name or "Usuário", confirm_url)

    try:
        send_email_html_mailgun(email, subject, html)
    except Exception:
        current_app.logger.exception("Falha ao reenviar e-mail de confirmação")
        return jsonify({"message": "Falha ao reenviar o e-mail de confirmação."}), 500

    return jsonify({"message": "Reenviamos o e-mail de confirmação."}), 200


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not all([email, password]):
        return jsonify({"error": "invalid_request", "message": "Campos obrigatórios ausentes"}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        pending = EmailVerification.query.filter(
            EmailVerification.email == email,
            EmailVerification.used.is_(False)
        ).first()
        if pending:
            return jsonify({"error": "email_unconfirmed", "message": "Confirme seu e-mail para concluir o cadastro."}), 403
        return jsonify({"error": "invalid_credentials", "message": "Credenciais inválidas"}), 401

    if not verify_password(password, user.password_hash):
        return jsonify({"error": "invalid_credentials", "message": "Credenciais inválidas"}), 401

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))
    return jsonify({"access": access_token, "refresh": refresh_token}), 200


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
@tenant_required
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({"access": access_token}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
@tenant_required
def me():
    user_id = uuid.UUID(str(get_jwt_identity()))
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "not_found", "message": "Usuário não encontrado"}), 404
    payload = {"id": str(user.id), "name": user.name, "email": user.email}
    if hasattr(User, "tenant_id"):
        payload["tenant_id"] = str(user.tenant_id)
    return jsonify(payload), 200

def _reset_url(token: str) -> str:
    return f"{APP_FRONTEND_URL}/auth/reset?{urlencode({'token': token})}"


@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "invalid_request", "message": "E-mail é obrigatório"}), 400

    user = User.query.filter_by(email=email).first()
    if user:
        PasswordReset.query.filter(
            PasswordReset.user_id == user.id,
            PasswordReset.used.is_(False)
        ).delete(synchronize_session=False)
        db.session.commit()

        token = secrets.token_urlsafe(32)
        pr = PasswordReset(
            user_id=user.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(hours=RESET_EXP_HOURS),
            used=False,
        )
        db.session.add(pr)
        db.session.commit()

        try:
            url = _reset_url(token)
            html = f"""
                <p>Olá, {user.name}!</p>
                <p>Para redefinir sua senha, clique no link abaixo (válido por {RESET_EXP_HOURS} horas):</p>
                <p><a href="{url}">{url}</a></p>
                <p>Se você não solicitou, ignore este e-mail.</p>
            """
            send_email_html_mailgun(user.email, "Redefinição de senha — Velório Solidário", html)
        except Exception:
            current_app.logger.exception("Falha ao enviar e-mail de reset de senha")

    return jsonify({"status": "ok"}), 200

@auth_bp.route("/reset-password/validate", methods=["GET"])
def validate_reset_token():
    token = (request.args.get("token") or "").strip()
    if not token:
        return jsonify({"error": "invalid_request", "message": "token é obrigatório"}), 400

    pr: PasswordReset | None = PasswordReset.query.filter_by(token=token, used=False).first()
    if not pr:
        return jsonify({"error": "invalid_token", "message": "Token inválido ou já utilizado"}), 400

    if pr.expires_at and pr.expires_at < datetime.utcnow():
        return jsonify({"error": "expired", "message": "Token expirado"}), 400

    user = User.query.get(pr.user_id) if pr.user_id else None
    return jsonify({
        "status": "ok",
        "email": user.email if user else None,
        "expires_at": pr.expires_at.isoformat() if pr.expires_at else None
    }), 200


@auth_bp.route("/reset-password", methods=["PATCH"])
def reset_password_with_token():
    data = request.get_json(silent=True) or {}
    token = (data.get("token") or "").strip()
    new_password = (data.get("new_password") or "").strip()

    if not token or not new_password:
        return jsonify({"error": "invalid_request", "message": "token e new_password são obrigatórios"}), 400

    pr: PasswordReset | None = PasswordReset.query.filter_by(token=token, used=False).first()
    if not pr:
        return jsonify({"error": "invalid_token", "message": "Token inválido ou já utilizado"}), 400

    if pr.expires_at and pr.expires_at < datetime.utcnow():
        return jsonify({"error": "expired", "message": "Token expirado"}), 400

    user = User.query.get(pr.user_id)
    if not user:
        return jsonify({"error": "not_found", "message": "Usuário não encontrado"}), 404

    if len(new_password) < 8:
        return jsonify({"error": "weak_password", "message": "A nova senha deve ter pelo menos 8 caracteres"}), 400
    if verify_password(new_password, user.password_hash):
        return jsonify({"error": "same_password", "message": "A nova senha deve ser diferente da atual"}), 400

    user.password_hash = hash_password(new_password)

    pr.used = True
    PasswordReset.query.filter(
        PasswordReset.user_id == user.id,
        PasswordReset.used.is_(False),
        PasswordReset.token != token
    ).update({PasswordReset.used: True}, synchronize_session=False)

    db.session.add(user)
    db.session.add(pr)
    db.session.commit()

    return jsonify({"status": "ok"}), 200


@auth_bp.route("/change-password", methods=["PATCH"])
@jwt_required()
@tenant_required
def change_password_authenticated():
    data = request.get_json(silent=True) or {}
    current_password = (data.get("current_password") or "").strip()
    new_password = (data.get("new_password") or "").strip()

    if not current_password or not new_password:
        return jsonify({
            "error": "invalid_request",
            "message": "current_password e new_password são obrigatórios"
        }), 400

    try:
        user_id = uuid.UUID(str(get_jwt_identity()))
    except Exception:
        return jsonify({"error": "unauthorized"}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "not_found", "message": "Usuário não encontrado"}), 404

    if not verify_password(current_password, user.password_hash):
        return jsonify({"error": "invalid_current_password", "message": "Senha atual inválida"}), 403

    if len(new_password) < 8:
        return jsonify({"error": "weak_password", "message": "A nova senha deve ter pelo menos 8 caracteres"}), 400
    if verify_password(new_password, user.password_hash):
        return jsonify({"error": "same_password", "message": "A nova senha deve ser diferente da atual"}), 400

    user.password_hash = hash_password(new_password)
    db.session.commit()

    return jsonify({"status": "ok"}), 200


@auth_bp.route("/delete-account", methods=["POST"])
@jwt_required()
@tenant_required
def delete_account():
    data = request.get_json(silent=True) or {}
    bank_account_id = (data.get("bank_account_id") or "").strip()
    confirmation = (data.get("confirmation") or "").strip()
    password = (data.get("password") or "").strip()

    if not bank_account_id or not confirmation or not password:
        return jsonify({"error": "invalid_request", "message": "bank_account_id, confirmation e password são obrigatórios"}), 400

    if confirmation.upper() != "EXCLUIR CONTA":
        return jsonify({"error": "confirmation_mismatch", "message": "Texto de confirmação inválido"}), 400

    try:
        user_id = uuid.UUID(str(get_jwt_identity()))
    except Exception:
        return jsonify({"error": "unauthorized"}), 401

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "not_found", "message": "Usuário não encontrado"}), 404

    if not verify_password(password, user.password_hash):
        return jsonify({"error": "invalid_current_password", "message": "Senha atual inválida"}), 403

    bank = BankAccount.query.filter_by(id=bank_account_id, owner_user_id=user.id).first()
    if not bank:
        return jsonify({"error": "bank_account_not_found", "message": "Conta bancária inválida"}), 404

    # Guarde o e-mail original ANTES de anonimizar (usaremos no webhook e eventual comunicação)
    original_email = user.email

    total_amount = (
        db.session.query(func.coalesce(func.sum(Contribution.amount), 0))
        .join(Fundraiser, Contribution.fundraiser_id == Fundraiser.id)
        .filter(Fundraiser.owner_user_id == user.id)
        .filter(Contribution.payment_status == PaymentStatus.PAID)
        .scalar()
    ) or 0

    if ADMIN_REPORT_EMAILS:
        try:
            html = _build_delete_account_email_html_admin(
                user=user,
                total_amount=Decimal(total_amount),
                bank=bank,
                deleted_at=datetime.utcnow(),
            )
            for admin_email in ADMIN_REPORT_EMAILS:
                send_email_html_mailgun(
                    to_email=admin_email,
                    subject="Conta excluída — valor a depositar",
                    html=html,
                )
        except Exception as exc:
            current_app.logger.exception("Falha ao enviar e-mail de exclusão de conta: %s", exc)

    try:
        try:
            if hasattr(Fundraiser, "is_public"):
                db.session.query(Fundraiser).filter(Fundraiser.owner_user_id == user.id).update(
                    {Fundraiser.is_public: False}, synchronize_session=False
                )
        except Exception:
            current_app.logger.exception("Falha ao tornar arrecadações privadas (prosseguindo mesmo assim)")

        # Soft delete/anônimização
        user.password_hash = hash_password(secrets.token_urlsafe(18))
        if hasattr(user, "is_active"):
            user.is_active = False
        if hasattr(user, "deleted_at"):
            user.deleted_at = datetime.utcnow()

        anon_email = f"deleted+{user.id}@example.invalid"
        if hasattr(user, "email"):
            user.email = anon_email
        if hasattr(user, "name"):
            user.name = "Conta excluída"

        db.session.add(user)
        db.session.commit()
    except Exception as exc:
        current_app.logger.exception("Falha ao efetuar soft delete: %s", exc)
        return jsonify({"error": "delete_failed", "message": "Não foi possível excluir a conta agora"}), 500

    try:
        notify_admin_webhook(
            "/webhooks/user-deleted",
            {
                "user_id": str(user.id),
                "email": original_email,
                "reason": "Solicitado pelo usuário",
            },
        )
    except Exception:
        # não quebra o fluxo para o usuário
        pass

    return jsonify({"status": "ok"}), 200

