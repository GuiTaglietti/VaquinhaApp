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
from ..models import User, EmailVerification, PasswordReset
from ..utils import hash_password, verify_password
from ..email_sender import send_email_html_mailgun, build_verification_email_html

auth_bp = Blueprint("auth", __name__)

CONFIRM_EXP_HOURS = int(os.getenv("CONFIRM_EXP_HOURS", "24"))
RESET_EXP_HOURS = int(os.getenv("RESET_EXP_HOURS", "2"))
APP_BACKEND_URL = os.getenv("APP_BACKEND_URL", "http://localhost:5055")
APP_FRONTEND_URL = os.getenv("APP_FRONTEND_URL", "http://localhost:5199")

def _confirm_url(token: str) -> str:
    return f"{APP_BACKEND_URL}/api/auth/confirm/{token}"

def _front_confirm_redirect(status: str, email: str | None = None) -> str | None:
    if not APP_FRONTEND_URL:
        return None
    qs = {"status": status}
    if email:
        qs["email"] = email
    return f"{APP_FRONTEND_URL}/auth/confirm?{urlencode(qs)}"


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
def refresh():
    identity = get_jwt_identity()
    access_token = create_access_token(identity=identity)
    return jsonify({"access": access_token}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
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


@auth_bp.route("/change-password", methods=["POST"])
def reset_password():
    data = request.get_json() or {}
    token = (data.get("token") or "").strip()
    new_password = (data.get("new_password") or "").strip()

    if not token or not new_password:
        return jsonify({"error": "invalid_request", "message": "token e new_password são obrigatórios"}), 400

    pr = PasswordReset.query.filter_by(token=token, used=False).first()
    if not pr:
        return jsonify({"error": "invalid_token", "message": "Token inválido"}), 404

    if pr.expires_at < datetime.utcnow():
        return jsonify({"error": "expired", "message": "Token expirado"}), 403

    user = pr.user
    user.password_hash = hash_password(new_password)
    pr.used = True
    db.session.commit()

    return jsonify({"status": "ok"}), 200

