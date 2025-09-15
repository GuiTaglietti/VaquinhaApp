from __future__ import annotations

import os
from datetime import datetime

from flask import request, jsonify, Blueprint
from werkzeug.exceptions import BadRequest, NotFound

from ..extensions import db, logger
from ..models import Fundraiser, FundraiserReport

from ..email_sender import (
    send_email_html_mailgun,
    _css_vars,
    _email_shell,
    APP_FRONTEND_URL,
)

reports_bp = Blueprint("reports", __name__)

ADMIN_REPORT_EMAILS = [
    e.strip() for e in os.getenv("ADMIN_REPORT_EMAILS", "").split(",") if e.strip()
]

def _build_report_email_html_admin(
    fundraiser: Fundraiser,
    reason: str,
    message: str | None,
    reporter_email: str | None,
    reported_at: datetime,
) -> str:
    """
    Monta e-mail em HTML para administradores com os dados da denúncia.
    Segue a paleta e componentes usados nos demais e-mails do projeto.
    """
    c = _css_vars()

    public_url = f"{APP_FRONTEND_URL}/p/{fundraiser.public_slug}" if getattr(fundraiser, "public_slug", None) else ""

    content = f"""
<p style="margin:0 0 14px 0">
  Uma nova denúncia foi registrada por um usuário contra uma arrecadação pública.
</p>

<div style="border:1px solid {c['border']};border-radius:12px;padding:12px;background:#fff;margin:12px 0">
  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">Arrecadação</span>
    <strong>{(fundraiser.title or '').strip()}</strong>
  </div>

  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">ID</span>
    <span>{fundraiser.id}</span>
  </div>

  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">Visibilidade</span>
    <span>{"Pública" if fundraiser.is_public else "Privada"}</span>
  </div>

  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">Motivo</span>
    <strong style="color:{c['brand_dark']}">{reason}</strong>
  </div>

  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">Reportado em</span>
    <span>{reported_at.strftime("%d/%m/%Y %H:%M")} (UTC)</span>
  </div>

  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">E-mail do denunciante</span>
    <span>{reporter_email or "-"}</span>
  </div>
</div>
"""

    if message:
        content += f"""
<h3 style="margin:18px 0 8px 0;font-size:16px">Mensagem do denunciante</h3>
<div style="white-space:pre-wrap;border:1px solid {c['border']};border-radius:12px;padding:12px;background:#fff;">
  {(message or "").strip()}
</div>
"""

    actions = []
    if public_url:
        actions.append(
            f"""<a href="{public_url}" style="
                  display:inline-block;padding:12px 18px;border-radius:10px;
                  text-decoration:none;background:{c['brand']};color:#fff;font-weight:600;box-shadow:{c['shadow']}
                ">Ver página pública</a>"""
        )

    content += f"""
<div style="margin-top:22px">{' '.join(actions)}</div>

<p style="margin:16px 0 0 0;color:{c['muted']};font-size:12px">
  Esta é uma notificação automática do sistema de denúncias do Velório Solidário.
</p>
"""

    return _email_shell("Nova denúncia recebida", content)


@reports_bp.post("/reports/fundraisers")
def report_fundraiser():
    data = request.get_json(silent=True) or {}

    fundraiser_id = (data.get("fundraiser_id") or "").strip()
    reason = (data.get("reason") or "").strip().lower()
    message = (data.get("message") or "").strip()
    reporter_email = (data.get("reporter_email") or "").strip()

    if not fundraiser_id or not reason:
        raise BadRequest("fundraiser_id e reason são obrigatórios")

    f = Fundraiser.query.get(fundraiser_id)
    if not f or not f.is_public:
        raise NotFound("Arrecadação não encontrada")

    report = FundraiserReport(
        fundraiser_id=f.id,
        reporter_email=reporter_email or None,
        reason=reason[:64],
        message=message[:1024] if message else None,
    )
    db.session.add(report)
    db.session.commit()

    if ADMIN_REPORT_EMAILS:
        try:
            html = _build_report_email_html_admin(
                fundraiser=f,
                reason=reason,
                message=message or None,
                reporter_email=reporter_email or None,
                reported_at=datetime.utcnow(),
            )
            for admin_email in ADMIN_REPORT_EMAILS:
                send_email_html_mailgun(
                    to_email=admin_email,
                    subject=f"[VELÓRIO SOLIDÁRIO] Nova denúncia: {f.title}",
                    html=html,
                )
        except Exception as exc:
            logger.exception("Falha ao enviar e-mail de denúncia: %s", exc)

    return jsonify({"status": "ok"}), 201
