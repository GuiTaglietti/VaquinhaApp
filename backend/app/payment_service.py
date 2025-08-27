"""Cliente para o serviço de pagamento.

Esta implementação realiza chamadas a um serviço externo que retorna dados de pagamento
mockados. Em um ambiente real, este módulo poderia utilizar ``requests`` ou uma
SDK específica para integrar com um gateway de pagamento. Para fins de exemplo,
retornamos um dicionário estático com os campos necessários.
"""

import logging

from flask import current_app


class PaymentService:
    """Serviço de pagamento mockado.

    Ao chamar ``create_payment_intent``, este serviço retornará um objeto com
    ``payment_intent_id``, ``pix_copia_e_cola`` e ``brcode``. Não há integração
    real com um gateway de pagamento.
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def create_payment_intent(self, amount: float) -> dict:
        """Cria uma intenção de pagamento.

        :param amount: Valor a ser cobrado.
        :return: Dicionário com dados do pagamento.
        """
        # Em uma integração real, você faria uma requisição HTTP ao serviço de
        # pagamentos usando ``requests`` ou outra biblioteca.
        # Por simplicidade, retornamos um valor estático.
        self.logger.debug(f"Criando intenção de pagamento para o valor {amount}")
        return {
            "payment_intent_id": "pi_dev_123",
            "pix_copia_e_cola": "000201...BR.GOV.BCB.PIX...",
            "brcode": "000201...BR.GOV.BCB.PIX..."
        }