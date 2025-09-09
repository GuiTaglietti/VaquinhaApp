from __future__ import annotations

import os
import re
import logging
import requests
from typing import Optional, Dict, Any
from datetime import datetime
from decimal import Decimal

APP_FRONTEND_URL = os.getenv("APP_FRONTEND_URL", "http://localhost:5199")
MAILGUN_DOMAIN = os.getenv("MAILGUN_DOMAIN", "")
MAILGUN_API_KEY = os.getenv("MAILGUN_API_KEY", "")
MAILGUN_FROM = os.getenv("MAILGUN_FROM", f"Velório Solidário <no-reply@{MAILGUN_DOMAIN}>")

def _css_vars() -> Dict[str, str]:
    return {
        "bg": "hsl(214 19% 94%)",
        "card": "#ffffff",
        "border": "hsl(214 19% 85%)",
        "shadow": "0 8px 30px hsl(200 14% 31% / .15)",
        "brand": "#1e90a3",
        "brand_dark": "#186f7e",
        "success": "hsl(147 23% 46%)",
        "warning": "hsl(35 100% 45%)",
        "muted": "hsl(200 14% 31%)",
        "fg": "hsl(0 0% 11%)",
    }

def _email_shell(title: str, content_html: str) -> str:
    c = _css_vars()
    year = datetime.utcnow().year
    return f"""\
<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<body style="margin:0;background:{c['bg']};color:{c['fg']};
             font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,'Noto Sans',sans-serif;">
  <div style="max-width:680px;margin:40px auto;background:{c['card']};border:1px solid {c['border']};
              border-radius:14px;box-shadow:{c['shadow']};overflow:hidden">
    <div style="padding:20px 24px;background:linear-gradient(135deg,{c['muted']},{c['brand']});color:white">
      <h1 style="margin:0;font-size:20px">{title}</h1>
    </div>
    <div style="padding:24px">
      {content_html}
      <hr style="border:none;border-top:1px solid {c['border']};margin:24px 0" />
      <p style="margin:0;color:{c['muted']};font-size:12px">
        Mensagem automática • <a style="color:{c['brand']};text-decoration:none" href="{APP_FRONTEND_URL}">{APP_FRONTEND_URL}</a> • © {year}
      </p>
    </div>
  </div>
</body></html>
"""

def _mask(s: Optional[str], keep_last: int = 4) -> str:
    if not s:
        return "-"
    s = re.sub(r"\s+", "", s)
    if len(s) <= keep_last:
        return "*" * len(s)
    return "*" * (len(s) - keep_last) + s[-keep_last:]

def _fmt_dt_br(dt: datetime | str | None) -> str:
    if not dt:
        return "-"
    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return dt
    return dt.strftime("%d/%m/%Y %H:%M")

def _as_str_amount(value: Any) -> str:
    try:
        n = float(value if not isinstance(value, Decimal) else float(value))
    except Exception:
        n = 0.0
    s = f"{n:,.2f}"
    return "R$ " + s.replace(",", "X").replace(".", ",").replace("X", ".")

def _strip_html(html: str) -> str:
    text = re.sub(r"<\s*br\s*/?>", "\n", html, flags=re.I)
    text = re.sub(r"<\s*/p\s*>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()

def send_email_html_mailgun(to_email: str, subject: str, html: str):
    if not MAILGUN_DOMAIN or not MAILGUN_API_KEY:
        raise RuntimeError("Mailgun não configurado: defina MAILGUN_DOMAIN e MAILGUN_API_KEY")
    url = f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages"
    data = {
        "from": MAILGUN_FROM,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    resp = requests.post(url, auth=("api", MAILGUN_API_KEY), data=data, timeout=15)
    resp.raise_for_status()
    return True

def build_verification_email_html(name: str, confirm_url: str) -> str:
    primary = "hsl(200 14% 31%)"
    primary_light = "hsl(200 14% 41%)"
    secondary = "hsl(147 23% 50%)"
    background = "hsl(214 19% 94%)"
    card = "hsl(0 0% 100%)"
    foreground = "hsl(0 0% 11%)"
    muted = "hsl(214 19% 90%)"
    border = "hsl(214 19% 85%)"

    return f"""\
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>Confirme seu e-mail</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    a{{text-decoration:none}}
    .btn:hover{{opacity:.92}}
    @media (prefers-color-scheme: dark) {{}}
  </style>
</head>
<body style="margin:0;padding:0;background:{background};color:{foreground};font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,'Helvetica Neue',Arial,'Noto Sans',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:{background};padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:{card};border-radius:12px;box-shadow:0 8px 30px hsl(200 14% 31% / .15);overflow:hidden;border:1px solid {border}">
          <tr>
            <td style="padding:32px;background:linear-gradient(135deg,{primary},{primary_light});color:white;">
              <h1 style="margin:0;font-size:24px;letter-spacing:.2px;">Velório Solidário</h1>
              <p style="margin:8px 0 0 0;opacity:.95;">Confirmação de e-mail</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;background:{card};">
              <p style="margin:0 0 12px 0;font-size:16px;">Olá, <strong>{name}</strong>!</p>
              <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">
                Para concluir seu cadastro, confirme seu e-mail clicando no botão abaixo. 
                Esse link expira em 24 horas.
              </p>

              <div style="text-align:center;margin:24px 0;">
                <a class="btn" href="{confirm_url}" target="_blank" 
                   style="display:inline-block;background:{secondary};color:white;padding:12px 20px;border-radius:10px;font-weight:600;">
                  Confirmar e-mail
                </a>
              </div>

              <p style="margin:0 0 8px 0;font-size:14px;color:{foreground};opacity:.8;">
                Se o botão não funcionar, copie e cole este link no navegador:
              </p>
              <p style="word-break:break-all;font-size:12px;background:{muted};padding:10px;border-radius:8px;">
                <a href="{confirm_url}" style="color:{foreground}">{confirm_url}</a>
              </p>

              <p style="margin:16px 0 0 0;font-size:12px;color:{foreground};opacity:.7;">
                Se você não solicitou este cadastro, ignore este e-mail.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:{background};font-size:12px;color:{foreground};opacity:.7;">
              © {__import__('datetime').datetime.utcnow().year} Velório Solidário
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

def build_withdrawal_email_html_admin(
    requester_name: str,
    requester_email: str,
    fundraiser_title: str,
    amount: Any,
    bank_info: Dict[str, Any],
    requested_at: datetime | str,
    control_url: Optional[str] = None,
    payout_url: Optional[str] = None,
) -> str:
    """
    E-mail para equipe/administradores sobre novo pedido de saque.
    NÃO inclui dados bancários completos; usa botão de link seguro (payout_url).
    """
    c = _css_vars()
    bank_name = (bank_info or {}).get("bank_name") or "-"
    bank_code = (bank_info or {}).get("bank_code") or "-"
    agency = (bank_info or {}).get("agency") or "-"
    account_number = (bank_info or {}).get("account_number") or "-"
    account_type = (bank_info or {}).get("account_type") or "-"
    account_holder_name = (bank_info or {}).get("account_holder_name") or "-"

    agency_masked = _mask(str(agency), keep_last=2)
    account_masked = _mask(str(account_number), keep_last=4)

    control_btn = (
        f"""<a href="{control_url}" style="
              display:inline-block;padding:12px 18px;border-radius:10px;margin-right:8px;
              text-decoration:none;background:{c['muted']};color:#fff;font-weight:600;box-shadow:{c['shadow']}
            ">Abrir arrecadação</a>"""
        if control_url else ""
    )

    payout_btn = (
        f"""<a href="{payout_url}" style="
              display:inline-block;padding:12px 18px;border-radius:10px;
              text-decoration:none;background:{c['success']};color:#fff;font-weight:600;box-shadow:{c['shadow']}
            ">Ver dados para pagamento</a>"""
        if payout_url else ""
    )

    body = f"""
<p style="margin:0 0 14px 0">Novo pedido de saque recebido.</p>

<div style="border:1px solid {c['border']};border-radius:12px;padding:12px;background:#fff;margin:12px 0">
  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">Solicitante</span>
    <strong>{requester_name or "-"}</strong>
  </div>
  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">E-mail</span>
    <a href="mailto:{requester_email}" style="color:{c['brand']};text-decoration:none">{requester_email}</a>
  </div>
  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">Arrecadação</span>
    <strong>{fundraiser_title or "-"}</strong>
  </div>
  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">Valor</span>
    <strong style="color:{c['brand_dark']}">{_as_str_amount(amount)}</strong>
  </div>
  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">Solicitado em</span>
    <span>{_fmt_dt_br(requested_at)} (UTC)</span>
  </div>
</div>

<h3 style="margin:18px 0 8px 0;font-size:16px">Conta de destino (resumo)</h3>
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
</table>

<div style="margin-top:22px">{control_btn} {payout_btn}</div>

<p style="margin:16px 0 0 0;color:{c['muted']};font-size:12px">
  Observação: o botão “Ver dados para pagamento” abre um link seguro, com expiração e limite de visualizações.
</p>
"""
    return _email_shell("Novo pedido de saque", body)

def build_withdrawal_email_html_user(
    requester_name: str,
    fundraiser_title: str,
    amount: Any,
    bank_info: Dict[str, Any],
    requested_at: datetime | str,
    control_url: Optional[str] = None,
) -> str:
    """
    E-mail de confirmação para o usuário solicitante.
    Mostra resumo do pedido e um link para acompanhar no painel.
    """
    c = _css_vars()
    bank_name = (bank_info or {}).get("bank_name") or "-"
    bank_code = (bank_info or {}).get("bank_code") or "-"
    agency = (bank_info or {}).get("agency") or "-"
    account_number = (bank_info or {}).get("account_number") or "-"
    account_type = (bank_info or {}).get("account_type") or "-"
    account_holder_name = (bank_info or {}).get("account_holder_name") or "-"

    # Apenas máscara no e-mail do usuário também (evita phishing com dados completos)
    agency_masked = _mask(str(agency), keep_last=2)
    account_masked = _mask(str(account_number), keep_last=4)

    control_btn = (
        f"""<a href="{control_url}" style="
              display:inline-block;padding:12px 18px;border-radius:10px;
              text-decoration:none;background:{c['brand']};color:#fff;font-weight:600;box-shadow:{c['shadow']}
            ">Acompanhar status</a>"""
        if control_url else ""
    )

    body = f"""
<p style="margin:0 0 14px 0">Olá, <strong>{requester_name or "Usuário"}</strong>! Recebemos seu pedido de saque.</p>

<div style="border:1px solid {c['border']};border-radius:12px;padding:12px;background:#fff;margin:12px 0">
  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">Arrecadação</span>
    <strong>{fundraiser_title or "-"}</strong>
  </div>
  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">Valor</span>
    <strong style="color:{c['brand_dark']}">{_as_str_amount(amount)}</strong>
  </div>
  <div style="display:flex;justify-content:space-between;margin:6px 0">
    <span style="color:{c['muted']}">Solicitado em</span>
    <span>{_fmt_dt_br(requested_at)} (UTC)</span>
  </div>
</div>

<h3 style="margin:18px 0 8px 0;font-size:16px">Conta de destino (resumo)</h3>
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
</table>

<div style="margin-top:22px">{control_btn}</div>

<p style="margin:16px 0 0 0;color:{c['muted']};font-size:12px">
  Se você não fez este pedido, ignore este e-mail e verifique sua conta.
</p>
"""
    return _email_shell("Recebemos seu pedido de saque", body)
