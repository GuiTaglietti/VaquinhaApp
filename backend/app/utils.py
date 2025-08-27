import re
import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple

from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from passlib.hash import bcrypt

from flask import current_app


def generate_slug(title: str) -> str:
    slug_base = re.sub(r"[^a-zA-Z0-9]+", "-", title.lower()).strip("-")
    random_suffix = uuid.uuid4().hex[:6]
    return f"{slug_base}-{random_suffix}"


def hash_password(password: str) -> str:
    """Gera o hash de uma senha usando bcrypt."""
    return bcrypt.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verifica se a senha fornecida corresponde ao hash armazenado."""
    return bcrypt.verify(password, password_hash)


def generate_audit_token(fundraiser_id: str, expires_in: int = 3600) -> Tuple[str, datetime]:
    """Cria um token de auditoria assinado que expira após ``expires_in`` segundos.

    Retorna o token e a data de expiração.
    """
    secret = current_app.config["AUDIT_TOKEN_SECRET"]
    serializer = URLSafeTimedSerializer(secret)
    expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
    token = serializer.dumps({"fundraiser_id": fundraiser_id, "exp": expires_at.timestamp()})
    return token, expires_at


def validate_audit_token(token: str) -> Optional[str]:
    """Valida o token de auditoria e retorna o ID da vaquinha se válido.

    Caso o token esteja expirado ou seja inválido, retorna ``None``.
    """
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