#!/bin/sh
set -e

echo "Aguardando Postgres em ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}..."
python - <<'PY'
import os, time, psycopg2
host=os.environ.get("POSTGRES_HOST","db")
port=int(os.environ.get("POSTGRES_PORT","5432"))
user=os.environ.get("POSTGRES_USER","postgres")
pwd=os.environ.get("POSTGRES_PASSWORD","postgres")
db=os.environ.get("POSTGRES_DB","vaquinhas_db")
for i in range(120):
    try:
        psycopg2.connect(host=host, port=port, user=user, password=pwd, dbname=db).close()
        print("Postgres OK"); break
    except Exception:
        time.sleep(1)
else:
    raise SystemExit("DB não respondeu a tempo")
PY

# helpers
low() { echo "$1" | tr '[:upper:]' '[:lower:]'; }

# Reset destrutivo opcional
if [ "$(low "${FORCE_RESET_DB:-}")" = "true" ] || [ "${FORCE_RESET_DB:-}" = "1" ] || [ "$(low "${FORCE_RESET_DB:-}")" = "yes" ]; then
  echo "[DB] FORCE_RESET_DB habilitado -> resetando banco..."
  python /app/reset_db.py
# Criação não-destrutiva opcional
elif [ "$(low "${CREATE_DB_ON_START:-}")" = "true" ] || [ "${CREATE_DB_ON_START:-}" = "1" ] || [ "$(low "${CREATE_DB_ON_START:-}")" = "yes" ]; then
  echo "[DB] CREATE_DB_ON_START habilitado -> criando tabelas (se necessário)..."
  python /app/create_db.py || true
fi

# Sobe o Flask dev (porta 5000)
echo "Iniciando Flask dev server em 0.0.0.0:5000"
exec flask run --host=0.0.0.0 --port=5000
