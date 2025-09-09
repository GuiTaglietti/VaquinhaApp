"""Ponto de entrada para o backend Flask.

Este módulo define a factory ``create_app`` que configura a aplicação, carrega
variáveis de ambiente, inicializa extensões e registra blueprints.
"""

import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, g, request, jsonify

from .extensions import db, jwt, cors, logger
from .payment_service import PaymentService
from .models import User

# Blueprints
from .auth.routes import auth_bp
from .fundraisers.routes import fundraisers_bp
from .contributions.routes import contributions_bp
from .public.routes import public_bp
from .profile.routes import profile_bp
from .explore.routes import explore_bp  
from .withdrawals.routes import withdrawals_bp
from .reports.routes import reports_bp
from .invoices.routes import invoices_bp


def create_app() -> Flask:
    """Cria e configura uma instância da aplicação Flask."""
    load_dotenv()

    app = Flask(__name__)

    # Configurações
    app.config.setdefault("SQLALCHEMY_DATABASE_URI", os.environ.get("DATABASE_URL"))
    app.config.setdefault("SQLALCHEMY_TRACK_MODIFICATIONS", False)
    app.config.setdefault("SECRET_KEY", os.environ.get("SECRET_KEY", "unsafe-secret-key"))
    app.config.setdefault("JWT_SECRET_KEY", os.environ.get("JWT_SECRET_KEY", "unsafe-jwt-secret"))
    app.config.setdefault("JWT_ACCESS_TOKEN_EXPIRES", timedelta(hours=1))
    app.config.setdefault("JWT_REFRESH_TOKEN_EXPIRES", timedelta(days=30))
    app.config.setdefault("CORS_ORIGINS", os.environ.get("CORS_ORIGINS", "*").split(","))
    app.config.setdefault("AUDIT_TOKEN_SECRET", os.environ.get("AUDIT_TOKEN_SECRET", "unsafe-audit-secret"))

    # Extensões
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}}, supports_credentials=True)

    # Serviço de pagamentos (mock)
    app.payment_service = PaymentService()

    # Multitenancy: pega tenant do header
    @app.before_request
    def load_tenant():
        g.tenant_id = request.headers.get("X-Tenant-ID")

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "bad_request", "message": str(error)}), 400

    # Blueprints (prefixo /api)
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(fundraisers_bp, url_prefix="/api/fundraisers")
    app.register_blueprint(contributions_bp, url_prefix="/api")
    app.register_blueprint(public_bp, url_prefix="/api")
    app.register_blueprint(profile_bp, url_prefix="/api")
    app.register_blueprint(explore_bp, url_prefix="/api")
    app.register_blueprint(withdrawals_bp, url_prefix="/api/withdrawals")
    app.register_blueprint(reports_bp, url_prefix="/api")
    app.register_blueprint(invoices_bp, url_prefix="/api")

    # Healthcheck
    @app.get("/api/healthz")
    def healthz():
        return {"status": "ok"}

    # ⚠️ DEV-ONLY: cria tabelas se ainda não existem (não usar em produção)
    if app.config.get("FLASK_ENV") == "development":
        with app.app_context():
            try:
                db.create_all()
            except Exception as exc:
                logger.warning("db.create_all() falhou (ok em prod com Alembic): %s", exc)

    return app
