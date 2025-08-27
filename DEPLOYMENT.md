# Guia de Deploy em Produção

Este documento descreve uma abordagem recomendada para publicar a aplicação **Vaquinhas Solidárias** em produção de forma segura, escalável e resiliente. As instruções assumem que você possui familiaridade básica com Linux, Docker e serviços como Nginx e PostgreSQL.

## 🌐 Arquitetura recomendada

A arquitetura sugerida utiliza **containers** para isolar cada componente e um **Nginx** na frente como proxy reverso com TLS, conforme o diagrama textual abaixo:

```
                 [ Internet ]
                      |
                   [ Nginx ]  ← certificado TLS (Let’s Encrypt)
                   /      \
        /api (proxy_pass)   /  (arquivos estáticos do Vue)
               |                         |
          [ Gunicorn ]             build estático (dist/)
               |
           [ Flask ]  
               |
        [ PostgreSQL ]
               |
        [ Volumes / Backups ]

```

**Componentes principais:**

* **Nginx**: Servidor web frontal responsável por terminar TLS/SSL, redirecionar HTTP→HTTPS, servir o frontend estático (build do Vue) e fazer proxy para a API Flask (`/api/*`).
* **Gunicorn**: Servidor WSGI que executa a aplicação Flask em modo de produção, utilizando múltiplos workers para melhor performance. Recomenda‑se usar o worker assíncrono baseado em Uvicorn (`uvicorn.workers.UvicornWorker`) se a aplicação tiver endpoints assíncronos.
* **Frontend**: Aplicação Vue compilada via `vite build` e hospedada como arquivos estáticos pelo Nginx.
* **PostgreSQL**: Banco de dados gerenciado (RDS, Cloud SQL) ou container dedicado com volume persistente para dados e backups.
* **Redis (opcional)**: Para cache e filas assíncronas no futuro.

## 📦 Variáveis de ambiente de produção

Copie os arquivos `.env.example` para `.env` em **backend** e **frontend** e ajuste:

* **backend/.env**
  * `FLASK_ENV=production`
  * `SECRET_KEY`, `JWT_SECRET_KEY`, `AUDIT_TOKEN_SECRET`: utilize valores longos e aleatórios.
  * `DATABASE_URL`: string de conexão do PostgreSQL (ex.: `postgresql+psycopg2://user:password@db:5432/vaquinhas_prod`).
  * `CORS_ORIGINS`: defina como o domínio do frontend (ex.: `https://vaquinhas.example.com`).
  * `PAYMENT_API_URL`: endpoint do gateway de pagamentos real (ou mantenha o mock).
* **frontend/.env**
  * `VITE_API_BASE_URL`: URL pública da API (ex.: `https://vaquinhas.example.com/api`).
  * `VITE_TENANT_ID`: ID do tenant configurado para esta instância.
  * `VITE_APP_NAME`: nome a ser exibido na barra do aplicativo.

Nunca commit ou exponha arquivos `.env` em repositórios públicos. Utilize gerenciadores de segredos quando disponíveis (AWS Secrets Manager, HashiCorp Vault etc.).

## 🐳 Docker em produção

Uma maneira conveniente de implantar é via **docker‑compose** com arquivos separados para desenvolvimento e produção. Um exemplo de configuração minimalista está descrito abaixo.

### docker-compose.yml

```yaml
version: '3.9'

services:
  db:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_DB: vaquinhas_prod
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: strongpassword
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      retries: 5

  backend:
    build:
      context: ./backend
    env_file:
      - ./backend/.env
    command: >-
      gunicorn app:app \
        -w 4 \
        -k uvicorn.workers.UvicornWorker \
        -b 0.0.0.0:5000 \
        --log-level=info
    restart: always
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./backend/app:/app/app:ro
    environment:
      - PYTHONUNBUFFERED=1

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_BASE_URL: ${VITE_API_BASE_URL}
    env_file:
      - ./frontend/.env
    command: sh -c "npm install && npm run build && cp -r dist /usr/share/nginx/html"
    image: node:18
    volumes:
      - ./frontend:/app
    working_dir: /app
    depends_on:
      - backend

  nginx:
    image: nginx:1.25
    restart: always
    volumes:
      - ./deploy/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./deploy/certs:/etc/letsencrypt
      - ./frontend/dist:/usr/share/nginx/html:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - frontend

volumes:
  db_data:
```

### Nginx

Crie um arquivo `deploy/nginx/nginx.conf` com duas seções **server**: uma para redirecionar HTTP para HTTPS e outra para servir o frontend e proxy as requisições da API.

```nginx
user  nginx;
worker_processes  auto;
error_log  /var/log/nginx/error.log warn;
pid        /var/run/nginx.pid;
events {
  worker_connections  1024;
}
http {
  include       /etc/nginx/mime.types;
  default_type  application/octet-stream;
  sendfile        on;
  keepalive_timeout  65;

  server {
    listen 80;
    server_name vaquinhas.example.com;
    return 301 https://$host$request_uri;
  }

  server {
    listen 443 ssl;
    server_name vaquinhas.example.com;

    ssl_certificate     /etc/letsencrypt/live/vaquinhas.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vaquinhas.example.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Headers de segurança
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Servir arquivos estáticos do frontend
    location / {
      root /usr/share/nginx/html;
      try_files $uri $uri/ /index.html;
    }

    # Proxy para a API
    location /api/ {
      proxy_pass         http://backend:5000/api/;
      proxy_set_header   Host $host;
      proxy_set_header   X-Real-IP $remote_addr;
      proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header   X-Forwarded-Proto $scheme;
      # Tempo de conexão keep‑alive
      proxy_http_version 1.1;
      proxy_set_header   Connection "";
    }
  }
}
```

Certifique‑se de substituir `vaquinhas.example.com` pelo seu domínio real.

### TLS/SSL com Let’s Encrypt

1. Instale o **certbot** no host ou utilize a imagem `certbot/certbot` via Docker.
2. Gere os certificados:

   ```bash
   docker run --rm -v ./deploy/certs:/etc/letsencrypt certbot/certbot certonly \
     --standalone --preferred-challenges http \
     -d vaquinhas.example.com --email seu-email@example.com --agree-tos --no-eff-email
   ```

3. Configure o `nginx.conf` para apontar para os certificados emitidos (ver acima).
4. Agende a renovação automática dos certificados (ex.: cron diário) executando `certbot renew`.

## 🔧 Build & Release

1. **Construir o frontend**:

   ```bash
   cd frontend
   npm install
   npm run build
   # O diretório dist/ conterá os arquivos estáticos prontos
   ```

2. **Instalar as dependências do backend** e rodar migrações:

   ```bash
   cd backend
   pip install -r requirements.txt
   # definir variáveis de ambiente de produção (.env)
   alembic upgrade head
   ```

3. **Inicializar o servidor Gunicorn**:

   ```bash
   gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:5000 --log-level=info
   ```

4. **Montar e iniciar os containers**:

   ```bash
   docker-compose -f docker-compose.yml up -d --build
   ```

## 🩺 Observabilidade e monitoramento

* **Logs estruturados**: a aplicação utiliza `structlog`. Configure um volume para `/var/log/` se quiser persistir logs de Nginx e Gunicorn. Integre com ferramentas como ELK ou Grafana Loki para centralizar logs.
* **Healthcheck**: exponha um endpoint `/healthz` no backend (já implementado) para verificação de disponibilidade. Configure Nginx ou ferramentas de orquestração para consultar este endpoint.
* **Métricas**: considere adicionar Prometheus + Grafana no futuro para métricas de performance.

## ⚖️ Escalabilidade

* **Workers e threads**: ajuste o número de workers do Gunicorn de acordo com o número de CPUs disponíveis. Para workloads síncronos, utilize workers do tipo `sync`; para workloads assíncronos, `uvicorn.workers.UvicornWorker`.
* **Escala horizontal**: implante múltiplas instâncias do backend atrás de um balanceador de carga (Nginx ou outro). Utilize banco de dados gerenciado para centralizar o estado.
* **Cache**: implemente Redis para armazenar páginas públicas (ex.: `/p/<slug>`) e aliviar o banco de dados.

## 🛡️ Segurança

* **Segredos**: nunca armazene chaves secretas no código. Use variáveis de ambiente ou secret manager.
* **CORS**: restrinja `CORS_ORIGINS` no backend para o domínio do frontend.
* **Headers de segurança**: veja as diretivas configuradas no Nginx (`X‑Content‑Type‑Options`, `X‑Frame‑Options`, `HSTS`).
* **Rate limiting**: adicione limitação de requisições em Nginx ou via middleware para rotas públicas e de contribuição.
* **Usuário não‑root**: configure seus containers para rodar como usuário não privilegiado sempre que possível.
* **Atualizações**: mantenha imagens base atualizadas e aplique patches de segurança regularmente.

## 🔄 Procedimento de atualização (rolling update)

1. Prepare uma nova imagem do frontend (`npm run build`) e do backend (instalando dependências e aplicando migrações).
2. Crie um **tag** de versão no seu repositório e gere imagens com essa tag.
3. Aplique migrações de banco com `alembic upgrade head` antes de apontar o tráfego para a nova versão.
4. Atualize serviços um a um usando `docker-compose up -d --build` ou via orquestrador (Kubernetes, Swarm). O Nginx pode manter conexões enquanto os containers antigos são substituídos.
5. Verifique se as rotas principais estão funcionando (`/healthz`, página inicial, login). Se houver problemas, reverter é tão simples quanto restaurar a imagem anterior.

## 🔁 Plano de rollback

* **Imagens antigas**: mantenha as imagens anteriores no registro (ex.: `backend:previous`, `frontend:previous`).
* **Backup de banco**: utilize `pg_dump` regularmente e retenha backups por um período definido. Para restaurar:

  ```bash
  pg_restore -U postgres -d vaquinhas_prod backup.sql
  ```

* **Reversão**: se a nova versão apresentar falhas, volte os containers para as imagens antigas e restaure o banco a partir do backup correspondente.

---

Seguindo este guia, você terá uma implantação sólida da aplicação **Vaquinhas Solidárias** em produção, pronta para escalar e segura contra incidentes. Adapte os exemplos às suas necessidades e boas práticas internas. Boa implantação! 🚀