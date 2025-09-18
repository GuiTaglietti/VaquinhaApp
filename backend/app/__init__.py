"""Ponto de entrada para o backend Flask.

Este módulo define a factory ``create_app`` que configura a aplicação, carrega
variáveis de ambiente, inicializa extensões e registra blueprints.
"""
import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, g, request, jsonify, send_from_directory

from .extensions import db, jwt, cors, logger
from .payment_service import PaymentService
from .models import User

from sqlalchemy.engine import URL

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
from .uploads.routes import uploads_bp 
from .legal.routes import legal_bp


def create_app() -> Flask:
    load_dotenv()
    app = Flask(__name__)

    def _getenv_file(key: str, default: str | None = None) -> str | None:
        path = os.getenv(f"{key}_FILE")
        if path and Path(path).exists():
            return Path(path).read_text().strip()
        return os.getenv(key, default)

    db_url_env = os.getenv("DATABASE_URL") or _getenv_file("DATABASE_URL")
    if db_url_env:
        db_url = db_url_env
    else:
        db_url = URL.create(
            drivername="postgresql+psycopg2",
            username=os.getenv("DATABASE_USER", "postgres"),
            password=_getenv_file("DB_PASSWORD") or os.getenv("DB_PASSWORD", ""),
            host=os.getenv("DATABASE_HOST", "db"),
            port=5432,
            database=os.getenv("DATABASE_NAME", "vaquinhas_db"),
        )

    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config.setdefault("SQLALCHEMY_TRACK_MODIFICATIONS", False)
    app.config.setdefault("SECRET_KEY", os.environ.get("SECRET_KEY", "unsafe-secret-key"))
    app.config.setdefault("JWT_SECRET_KEY", os.environ.get("JWT_SECRET_KEY", "unsafe-jwt-secret"))
    app.config.setdefault("JWT_ACCESS_TOKEN_EXPIRES", timedelta(hours=1))
    app.config.setdefault("JWT_REFRESH_TOKEN_EXPIRES", timedelta(days=30))
    app.config.setdefault("CORS_ORIGINS", os.environ.get("CORS_ORIGINS", "*").split(","))
    app.config.setdefault("AUDIT_TOKEN_SECRET", os.environ.get("AUDIT_TOKEN_SECRET", "unsafe-audit-secret"))

    # Uploads
    app.config.setdefault("UPLOAD_DIR", os.environ.get("UPLOAD_DIR", "/app/uploads"))
    app.config.setdefault("UPLOAD_PUBLIC_BASE", os.environ.get("UPLOAD_PUBLIC_BASE", "/files"))

    # Extensões
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}}, supports_credentials=True)

    # Service
    app.payment_service = PaymentService()

    try:
        if os.getenv("PIX_REGISTER_WEBHOOK_ON_STARTUP", "true").lower() in ("1", "true", "yes"):
            resp = app.payment_service.register_psp_webhook()
            logger.info("Webhook PSP registrado via PIX-Module: %s", resp.get("status", "ok"))
    
    except Exception as exc:
        logger.warning("Falha ao registrar webhook no PSP via PIX-Module: %s", exc)

    # Tenant
    @app.before_request
    def load_tenant():
        g.tenant_id = request.headers.get("X-Tenant-ID")

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"error": "bad_request", "message": str(error)}), 400

    # Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(fundraisers_bp, url_prefix="/api/fundraisers")
    app.register_blueprint(contributions_bp, url_prefix="/api")
    app.register_blueprint(public_bp, url_prefix="/api")
    app.register_blueprint(profile_bp, url_prefix="/api")
    app.register_blueprint(explore_bp, url_prefix="/api")
    app.register_blueprint(withdrawals_bp, url_prefix="/api/withdrawals")
    app.register_blueprint(reports_bp, url_prefix="/api")
    app.register_blueprint(invoices_bp, url_prefix="/api")
    app.register_blueprint(uploads_bp)  
    app.register_blueprint(legal_bp, url_prefix="/api")

    def _ensure_upload_dir():
        upload_dir = app.config["UPLOAD_DIR"]
        Path(upload_dir).mkdir(parents=True, exist_ok=True)
        return upload_dir

    _ensure_upload_dir()

    @app.get("/files/<path:filename>")
    def public_files(filename: str):
        upload_dir = app.config["UPLOAD_DIR"]
        return send_from_directory(upload_dir, filename)

    # Healthcheck
    @app.get("/api/healthz")
    def healthz():
        return {"status": "ok"}

    # Dev-only
    if app.config.get("FLASK_ENV") == "development":
        with app.app_context():
            try:
                db.create_all()
            except Exception as exc:
                logger.warning("db.create_all() falhou (ok em prod com Alembic): %s", exc)

    return app
