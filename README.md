# Vaquinhas Solidárias

Este repositório contém uma aplicação completa para gerenciamento de vaquinhas de funerais solidários. O sistema é multi‑tenant e permite que cada organização (tenant) crie e gerencie suas próprias campanhas de arrecadação, aceitando contribuições de terceiros via PIX. A solução é composta por um backend em **Flask** e um frontend em **Vue 3**, fornecendo uma experiência moderna e responsiva para administradores e doadores.

## 🧭 Objetivos

* Permitir o **cadastro e autenticação de usuários** por tenant.
* Fornecer **CRUD completo de vaquinhas** (criar, listar, editar, excluir) por usuário.
* Permitir que **qualquer pessoa contribua** em uma vaquinha escolhendo o valor da doação, com opção de anonimato.
* Integrar com um **serviço de pagamentos mockado** para gerar dados de PIX (copia‑e‑cola e BR Code) e exibir QR Code no front‑end.
* Disponibilizar **links públicos** para divulgação da vaquinha e **links de auditoria** (token assinado) para acesso a dados confidenciais de forma temporária.
* Oferecer um **dashboard** para cada usuário com suas vaquinhas e contribuições.

## 🛠️ Tecnologias utilizadas

### Frontend

* **Vue 3 + Vite + TypeScript** – estrutura moderna para SPAs.
* **Pinia** – gerenciamento de estado.
* **Vue Router** – roteamento de páginas públicas e privadas.
* **Tailwind CSS** – utilitário de estilos.
* **Element Plus** – biblioteca de componentes UI.
* **Vue i18n** – internacionalização (pt‑BR por padrão, preparado para en‑US).
* **qrcode** – geração de QR Code a partir de BR Code.

### Backend

* **Flask** – microframework web em Python.
* **Flask‑JWT‑Extended** – autenticação JWT (tokens de acesso e refresh).
* **SQLAlchemy + Alembic** – ORM e migrações de banco de dados.
* **PostgreSQL** – banco de dados relacional.
* **Flask‑CORS** – configuração de CORS.
* **uuid** como chave primária e **multi‑tenant via cabeçalho `X‑Tenant‑ID`**.
* **passlib[bcrypt]** – hashing de senhas.
* **itsdangerous** – geração e validação de tokens de auditoria.

### Infraestrutura

* **Docker + docker‑compose** para facilitar a execução local e a implantação em produção.
* Arquivos **`.env`** centralizam configurações sensíveis.
* **Structlog** – logs estruturados (podem ser integrados com ferramentas de observabilidade).

## 📁 Estrutura de pastas

```
/
├── backend
│   ├── app
│   │   ├── __init__.py          # Factory do Flask e registro de blueprints
│   │   ├── models.py            # Modelos SQLAlchemy (User, Fundraiser, Contribution)
│   │   ├── extensions.py        # Instâncias de extensões (db, jwt, cors, logger)
│   │   ├── utils.py             # Utilidades (slug, hash de senha, tokens)
│   │   ├── decorators.py        # Decoradores (ex.: verificação de tenant)
│   │   ├── payment_service.py   # Serviço mockado para criação de pagamentos
│   │   ├── auth
│   │   │   └── routes.py        # Endpoints de autenticação
│   │   ├── fundraisers
│   │   │   └── routes.py        # Endpoints de CRUD e compartilhamento de vaquinhas
│   │   ├── contributions
│   │   │   └── routes.py        # Endpoints de contribuições e callback de pagamento
│   │   └── public
│       └── routes.py            # Endpoints públicos (/p/<slug> e /a/<token>)
│   ├── requirements.txt         # Dependências Python
│   ├── Dockerfile              # Build da aplicação backend
│   └── .env.example            # Variáveis de ambiente de exemplo para o backend
├── frontend
│   ├── index.html              # Documento HTML principal
│   ├── package.json            # Dependências Node
│   ├── vite.config.ts          # Configuração do Vite
│   ├── tailwind.config.js      # Configuração do Tailwind CSS
│   ├── postcss.config.js       # Configuração do PostCSS
│   ├── tsconfig.json           # Configuração TypeScript
│   ├── .env.example            # Variáveis de ambiente de exemplo para o frontend
│   └── src
│       ├── main.ts             # Ponto de entrada do Vue
│       ├── App.vue             # Componente raiz
│       ├── api.ts             # Instância Axios com cabeçalhos de autenticação
│       ├── i18n.ts            # Mensagens traduzidas
│       ├── router
│       │   └── index.ts        # Definição de rotas
│       ├── stores
│       │   └── auth.ts         # Gerenciamento de autenticação com Pinia
│       ├── components          # Componentes reutilizáveis (FundraiserCard, DonateDialog, etc.)
│       └── views               # Páginas (Login, Registro, Dashboard, etc.)
├── docker-compose.yml          # Orquestração de containers (db, backend, frontend)
├── README.md                   # Este documento
└── DEPLOYMENT.md               # Guia de deploy em produção
```

## 🚀 Pré‑requisitos

* **Node.js 18+** – para executar o frontend no modo de desenvolvimento.
* **NPM ou Yarn** – para gerenciar dependências do frontend.
* **Python 3.12+** – para rodar o backend localmente.
* **PostgreSQL 13+** – para o banco de dados (ou utilize o container no docker‑compose).
* **Docker e docker‑compose** – para rodar a aplicação de forma containerizada.

## ⚙️ Configuração

1. Clone o repositório e entre na pasta raiz.
2. Copie os arquivos de exemplo de variáveis de ambiente:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. Ajuste os valores em **backend/.env** e **frontend/.env** conforme o seu ambiente. Para produção, lembre‑se de alterar as chaves secretas (`SECRET_KEY`, `JWT_SECRET_KEY`, `AUDIT_TOKEN_SECRET`) e apontar `DATABASE_URL` para seu banco de dados PostgreSQL.

## 🧑‍💻 Execução local (sem Docker)

### Backend

1. Instale as dependências Python dentro de um ambiente virtual:

   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Linux/macOS
   # .\venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

2. Aplique as migrações (ou simplesmente crie as tabelas na primeira execução):

   ```bash
   flask --app app db upgrade  # utiliza o Alembic (opcional se preferir db.create_all)
   ```

3. Inicie o servidor Flask em modo de desenvolvimento:

   ```bash
   flask --app app run --host=0.0.0.0 --port=5000
   ```

O backend estará disponível em `http://localhost:5000`.

### Frontend

1. Instale as dependências Node:

   ```bash
   cd frontend
   npm install
   ```

2. Inicie o servidor de desenvolvimento do Vite:

   ```bash
   npm run dev
   ```

O frontend estará disponível em `http://localhost:5173` e se comunicará com o backend na porta 5000.

## 🐳 Execução via Docker

O projeto inclui um **docker‑compose.yml** que orquestra os serviços de banco de dados, backend e frontend.

Para iniciar tudo de uma vez:

```bash
docker-compose up --build
```

Serviços disponibilizados:

* **backend**: `http://localhost:5000` – API Flask.
* **frontend**: `http://localhost:5173` – Aplicação Vue.
* **db**: porta `5432` – banco de dados PostgreSQL com dados persistidos em volume docker.

> **Atenção**: o serviço de pagamento mockado não está incluso no compose. O backend retorna um objeto estático quando uma contribuição é criada.

## 🔄 Fluxo de uso

1. **Registro e login**: Acesse `/auth/register` para criar um usuário e depois faça login em `/auth/login`. Lembre‑se de enviar o cabeçalho `X‑Tenant‑ID` (o frontend faz isso automaticamente).
2. **Criar vaquinha**: No painel, clique em “Nova Vaquinha”, preencha as informações e salve.
3. **Compartilhar**: Na lista de vaquinhas ou na página de detalhes, clique em “Compartilhar” para gerar links público e de auditoria.
4. **Doar**: Clique em “Doar” e escolha o valor, mensagem e anonimato. O backend retorna o código PIX (copia‑e‑cola) e o BR Code. O frontend exibe o QR Code para facilitar o pagamento.
5. **Auditoria**: O link de auditoria permite ver todas as contribuições de forma read‑only até a expiração do token.

## 📝 Considerações finais

* Esta aplicação é um esqueleto funcional e serve como base para customizações futuras. Você pode adicionar validações, internacionalizações extras, upload de imagens e integração real com gateway de pagamentos.
* Utilize o arquivo **DEPLOYMENT.md** para um guia passo a passo de implantação em produção, incluindo dicas de segurança, configuração de Nginx e Gunicorn, e práticas recomendadas de backup e observabilidade.

Boa hacking! 🚀