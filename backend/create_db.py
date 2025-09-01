import os
from app import create_app
from app.extensions import db

app = create_app()

with app.app_context():
    print(">> Criando todas as tabelas no banco...")
    db.create_all()
    print(">> Tabelas criadas com sucesso!")
