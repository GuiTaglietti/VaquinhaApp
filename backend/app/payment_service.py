import logging, uuid

class PaymentService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def create_payment_intent(self, amount: float) -> dict:
        self.logger.debug(f"Criando intenção de pagamento para o valor {amount}")
        pid = f"pi_dev_{uuid.uuid4().hex[:12]}"
        return {
            "payment_intent_id": pid,
            "pix_copia_e_cola": "000201...BR.GOV.BCB.PIX...",
            "brcode": "000201...BR.GOV.BCB.PIX..."
        }
