import re
import uuid
import os
import requests
from datetime import datetime, timedelta
from typing import Optional, Tuple
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from passlib.hash import bcrypt
from flask import current_app
from .models import User, BankAccount
from datetime import timezone
from sqlalchemy import and_
from app.extensions import db

def is_document_in_use(document_number: str, document_type: str, *, exclude_user_id: Optional[str] = None, tenant_id: Optional[str] = None) -> bool:
    if not document_number or not document_type:
        return False

    q = User.query.filter(
        and_(
            User.document_type == document_type,
            User.document_number == document_number,
        )
    )

    if tenant_id is not None:
        q = q.filter(User.tenant_id == tenant_id)

    if exclude_user_id is not None:
        q = q.filter(User.id != exclude_user_id)

    return db.session.query(q.exists()).scalar()


def is_cpf_in_use(cpf: str, *, exclude_user_id: Optional[str] = None, tenant_id: Optional[str] = None) -> bool:
    return is_document_in_use(cpf, "CPF", exclude_user_id=exclude_user_id, tenant_id=tenant_id)

def is_cnpj_in_use(cnpj: str, *, exclude_user_id: Optional[str] = None, tenant_id: Optional[str] = None) -> bool:
    return is_document_in_use(cnpj, "CNPJ", exclude_user_id=exclude_user_id, tenant_id=tenant_id)

def generate_slug(title: str) -> str:
    slug_base = re.sub(r"[^a-zA-Z0-9]+", "-", title.lower()).strip("-")
    random_suffix = uuid.uuid4().hex[:6]
    return f"{slug_base}-{random_suffix}"


def hash_password(password: str) -> str:
    return bcrypt.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.verify(password, password_hash)


def generate_audit_token(fundraiser_id: str, expires_in: int = 3600) -> Tuple[str, datetime]:
    secret = current_app.config["AUDIT_TOKEN_SECRET"]
    serializer = URLSafeTimedSerializer(secret)
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
    token = serializer.dumps({"fundraiser_id": fundraiser_id, "exp": expires_at.timestamp()})
    return token, expires_at


def validate_audit_token(token: str) -> Optional[str]:
    secret = current_app.config.get("AUDIT_TOKEN_SECRET")
    serializer = URLSafeTimedSerializer(secret)
    try:
        data = serializer.loads(token, max_age=60 * 60 * 24 * 30)  # limite máximo de 30 dias
        fundraiser_id = data.get("fundraiser_id")
        exp = data.get("exp")
        if exp and datetime.utcnow().timestamp() > exp:
            return None
        return fundraiser_id
    except (BadSignature, SignatureExpired):
        return None
    
_ONLY_DIGITS = re.compile(r"\D+")

def only_digits(s: Optional[str]) -> Optional[str]:
    if not s:
        return s
    return _ONLY_DIGITS.sub("", s)

def validate_cpf(num: str) -> bool:
    s = only_digits(num) or ""
    if len(s) != 11 or len(set(s)) == 1:
        return False
    def dv(digs):
        soma = sum(int(d)*w for d, w in zip(digs, range(len(digs)+1, 1, -1)))
        r = (soma * 10) % 11
        return 0 if r == 10 else r
    return dv(s[:9]) == int(s[9]) and dv(s[:10]) == int(s[10])

def validate_cnpj(num: str) -> bool:
    s = only_digits(num) or ""
    if len(s) != 14 or len(set(s)) == 1:
        return False
    def dv(digs, pesos):
        soma = sum(int(d)*p for d, p in zip(digs, pesos))
        r = soma % 11
        return 0 if r < 2 else 11 - r
    p1 = [5,4,3,2,9,8,7,6,5,4,3,2]
    p2 = [6] + p1
    return dv(s[:12], p1) == int(s[12]) and dv(s[:13], p2) == int(s[13])

def is_profile_complete(u: User) -> bool:
    required = [
        u.name,
        u.document_type,
        u.document_number,
        u.phone,
        u.addr_street,
        u.addr_number,
        u.addr_neighborhood,
        u.addr_city,
        u.addr_state,
        u.addr_zip_code,
    ]
    if not all(bool(x) for x in required):
        return False
    if u.document_type == "CPF" and not validate_cpf(u.document_number or ""):
        return False
    if u.document_type == "CNPJ" and not validate_cnpj(u.document_number or ""):
        return False
    return True

def user_has_bank_account(u: User) -> bool:
    return bool(u.bank_accounts and len(u.bank_accounts) > 0)

def iso_utc(dt):
    if not dt:
        return None
    
    return dt.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")


def notify_admin_webhook(path: str, payload: dict):
    base = (os.getenv("ADMIN_BACKEND_URL") or "").rstrip("/")
    if not base:
        current_app.logger.warning("ADMIN_BACKEND_URL não definido; ignorando webhook %s", path)
        return

    url = f"{base}{path}"
    headers = {}
    key = (os.getenv("ADMIN_WEBHOOK_KEY") or "").strip()
    if key:
        headers["X-Admin-Api-Key"] = key

    try:
        requests.post(url, json=payload, headers=headers, timeout=5)
    except Exception as exc:
        current_app.logger.exception("Falha ao chamar webhook %s: %s", url, exc)