from __future__ import annotations
import hmac, hashlib, time
from typing import Optional
import requests


class PaymentError(Exception):
    ...


class PaymentService:
    def __init__(self):
        import os
        self.base_url = os.getenv("PIX_BASE_URL", "http://pix-module:8000").rstrip("/")
        self.api_key = os.getenv("PIX_API_KEY")
        self.webhook_secret = os.getenv("PIX_WEBHOOK_SECRET") or ""
        self.session = requests.Session()
        self.timeout = (3.0, 10.0)

        if not self.api_key:
            raise RuntimeError("PIX_API_KEY não configurado")

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def create_payment_intent(
        self,
        amount: float,
        *,
        cpf: Optional[str] = None,
        name: Optional[str] = None,
        email: Optional[str] = None,
    ) -> dict:
        """
        Cria a cobrança imediata no PIX-Module.
        Preenche fallbacks para doações anônimas:
          - cpf: "00000000191" (CPF de teste)
          - name: "Contribuinte Anônimo"
          - email: "anon@vaquinhas.local"
        """
        cpf = (cpf or "00000000191").strip()
        name = (name or "Contribuinte Anônimo").strip()
        email = (email or "anon@vaquinhas.local").strip()

        payload = {"amount": float(amount), "cpf": cpf, "name": name, "email": email}

        r = self.session.post(
            f"{self.base_url}/api/v1/pix",
            json=payload,
            headers=self._headers(),
            timeout=self.timeout,
        )
        if r.status_code >= 400:
            raise PaymentError(f"PIX create failed: {r.text}")

        data = r.json()
        if not data.get("txid") or not data.get("pixCopiaECola"):
            raise PaymentError("PIX-Module respondeu sem txid/pixCopiaECola")

        return {
            "payment_intent_id": data["txid"],
            "pix_copia_e_cola": data["pixCopiaECola"],
            "brcode": data["pixCopiaECola"],
        }

    def fetch_status(self, txid: str) -> dict:
        r = self.session.put(
            f"{self.base_url}/api/v1/pix/{txid}/status",
            headers=self._headers(),
            timeout=self.timeout,
        )
        if r.status_code == 404:
            return {"not_found": True}
        if r.status_code >= 400:
            raise PaymentError(f"PIX status failed: {r.text}")
        return r.json()

    def verify_webhook(
        self,
        body_bytes: bytes,
        signature: str,
        timestamp: str,
        *,
        tolerance_sec: int = 300,
    ) -> bool:
        """
        Verifica HMAC-SHA256 no formato: hex(hmac(secret, f"{timestamp}.{body}")).
        """
        try:
            ts = int(timestamp)
            if abs(time.time() - ts) > tolerance_sec:
                return False
        except Exception:
            return False

        mac = hmac.new(
            self.webhook_secret.encode(),
            f"{timestamp}.".encode() + body_bytes,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(mac, signature or "")
    
    def register_psp_webhook(self) -> dict:
        """
        Pede ao PIX-Module que registre, no PSP, a URL de webhook.
        Por padrão, usa PIX_MODULE_WEBHOOK_PUBLIC_URL (env) — deve ser a URL pública
        do endpoint **do PIX-Module** /api/v1/webhooks/pix que o PSP consegue alcançar.

        Em dev, se não houver a env, cai no fallback base_url/webhooks/pix
        (útil apenas em ambientes totalmente locais/mocados).
        """
        import os
        webhook_url = os.getenv("PIX_MODULE_WEBHOOK_PUBLIC_URL")
        if not webhook_url:
            webhook_url = f"{self.base_url}/api/v1/webhooks/pix"

        payload = {"webhook_url": webhook_url}
        r = self.session.post(
            f"{self.base_url}/api/v1/webhooks/config",
            json=payload,
            headers=self._headers(),  # Authorization: Bearer <API_KEY>
            timeout=self.timeout,
        )
        if r.status_code >= 400:
            raise PaymentError(f"Webhook register failed: {r.text}")
        return r.json()

