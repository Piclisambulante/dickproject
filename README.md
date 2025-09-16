
# Padaria L'Azur — Flask + Postgres (Render) + Cloudinary + PIX

## Endpoints principais
- `/` — Home
- `/cardapio` — Lista todos os produtos
- `/carrinho` — Carrinho (solicita nome e CEP se não autenticado)
- `/checkout` — Resumo e botão para gerar PIX
- `/checkout/criar-pedido` — Cria pedido e BR Code
- `/pagamento/pix/<order_id>` — Tela de pagamento PIX com QR e payload (polling de status)
- `/perfil` — Perfil do usuário (login necessário)
- `/historico` — Histórico dos últimos 15 dias (login necessário)
- `/sobre` — Página institucional
- `/api/products [GET, POST]` — Listagem e criação (com upload para Cloudinary)
- `/api/order-status/<order_id>` — Status JSON para o polling
- `/webhook/pix [POST]` — Webhook para confirmar pagamento via PSP (opcional)

## Banco de dados
Usa PostgreSQL (SQLAlchemy). Em produção (Render), defina `DATABASE_URL`.

## Cloudinary
Envie imagens de produtos via `POST /api/products` com multipart `image`.
Defina `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

## PIX (funciona sem PSP)
O BR Code é gerado localmente (estático/dinâmico com TXID) e o QR é exibido. Para confirmação automática, configure seu PSP (Mercado Pago, Gerencianet, etc.) para chamar `POST /webhook/pix` com `txid` ou `order_id` quando o pagamento for reconhecido. Sem PSP, marque como pago manualmente no banco.

### Variáveis
- `PIX_KEY` — Chave Pix (email, CPF/CNPJ, EVP, etc.)
- `PIX_MERCHANT_NAME` — Nome do recebedor (máx 25)
- `PIX_MERCHANT_CITY` — Cidade (máx 15, sem acento)

## Rodando localmente
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # edite
python run.py
```

## Deploy no Render
1. Crie um novo Web Service no Render apontando para este repositório/zip.
2. Runtime: Python 3.11
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `gunicorn run:app`
5. Variáveis de ambiente: `SECRET_KEY`, `DATABASE_URL` (Render Postgres), `CLOUDINARY_*`, `PIX_*`.
6. Banco: adicione um Render PostgreSQL e conecte o `DATABASE_URL`.

## Observações
- Templates são simples: substitua pelo seu design.
- Segurança mínima implementada (hash de senha, Flask-Login). Reforce conforme necessidade.


---

## Novidades (profissionalizado)
- **CSRF** em todos os formulários (Flask‑WTF)
- **Painel Admin** (`/admin`) com:
  - CRUD de produtos (upload para Cloudinary)
  - Lista de pedidos e mudança de status (pending/paid/cancelled)
  - **Audit log** de ações administrativas
- **Migrations** com **Alembic**
  - Rodar: `alembic upgrade head`
- **Sentry** (opcional): defina `SENTRY_DSN` para rastrear erros
- **Testes** com **pytest**
  - Rodar: `pytest -q`

### Criando o primeiro admin
Após criar um usuário normal (registro), no banco rode:
```sql
UPDATE "user" SET is_admin = true WHERE email = 'seu@email.com';
```
(ou crie um seed/fab comando à parte).

### Fluxo de deploy no Render (com Alembic)
1. Fazer deploy do serviço (com `gunicorn run:app`).
2. Criar **Background Worker** no Render **ou** usar **Shell** para executar:
   `alembic upgrade head` — aplica as tabelas/alterações.
3. (Opcional) Configurar webhook do seu PSP para `POST /webhook/pix` com `txid`.



## Ambientes

### Local (Windows / SQLite)
```
pip install -r requirements.windows.txt
python app.py
```
Sem `DATABASE_URL`, o app usa SQLite (`local.db`).

### Produção (Render/Heroku – Postgres)
```
pip install -r requirements.prod.txt
# Configure DATABASE_URL (postgresql+psycopg://...)
python app.py
```
O app aceita `postgres://` e faz o replace para `postgresql+psycopg://`.


## Configuração (.env)
Crie um arquivo `.env` com:

```
FLASK_ENV=development
SECRET_KEY=change-me

# PIX
PIX_KEY=seu.email@provedor.com
PIX_MERCHANT_NAME=Padaria L'Azur
PIX_MERCHANT_CITY=Curitiba

# Cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## Solução de problemas (PIX)
- **QR não aparece**: verifique se `qrcode` e `Pillow` estão instalados e se `PIX_KEY` está definido.
- **Payload inválido no app do banco**: confirme `PIX_MERCHANT_NAME` (máx. 25 chars) e `PIX_MERCHANT_CITY` (máx. 15 chars).
- **Ambiente de produção**: gere o `txid` único por pedido e use webhook do PSP para confirmação automática.

