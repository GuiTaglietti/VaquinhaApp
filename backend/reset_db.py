# backend/reset_db.py
import os
from sqlalchemy import text
from app import create_app
from app.extensions import db

FORCE = os.getenv("FORCE_RESET_DB", "").lower() in ("1", "true", "yes")
MODE = os.getenv("RESET_MODE", "schema")  # "schema" (mais agressivo) ou "metadata"

if not FORCE:
    raise SystemExit("FORCE_RESET_DB não está habilitado. Abortando por segurança.")

app = create_app()
with app.app_context():
    uri = app.config["SQLALCHEMY_DATABASE_URI"]
    print(f">> Conectando em: {uri}")

    if MODE == "schema":
        # Mais robusto para Postgres: derruba TODO o schema (tabelas, tipos, constraints, enums, etc.)
        print(">> Droppando schema public (CASCADE)...")
        db.session.execute(text("DROP SCHEMA IF EXISTS public CASCADE;"))
        db.session.execute(text("CREATE SCHEMA public;"))
        # permissões padrão (ajuste se usar roles diferentes)
        db.session.execute(text("GRANT ALL ON SCHEMA public TO public;"))
        db.session.commit()
    else:
        # Método “metadata”: dropa só o que está em db.metadata
        print(">> db.drop_all() em metadata...")
        db.drop_all()

    print(">> Criando tabelas (db.create_all)...")
    db.create_all()
    db.session.commit()
    print(">> Banco recriado com sucesso!")
