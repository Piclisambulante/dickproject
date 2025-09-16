# Ultra Ready — Como rodar 100%

1) Instale dependências:
```
pip install -r requirements.txt
```

2) Banco (Render):
- Confirme no .env:
  - SQLALCHEMY_DATABASE_URI=postgresql+psycopg://... ?sslmode=require
  - DATABASE_URL=postgresql+psycopg://... ?sslmode=require
- Crie tabelas (uma vez):
```
python init_db.py
```

3) Rodar:
```
python app.py
```

4) Produtos com imagem:
- Por padrão tentamos Cloudinary. Se a credencial estiver inválida ou faltando, **salvamos localmente** em `/static/uploads` automaticamente (sem travar).
- Para forçar local, defina `CLOUDINARY_MODE=off` no .env.
- Para obrigar Cloudinary e falhar se faltar credencial, use `CLOUDINARY_MODE=on`.

5) PIX fluxo:
- A tela de PIX faz polling e **redireciona para Sucesso** quando o pedido virar `paid`.
- Teste local: na tela do PIX, clique **"Já paguei (testar)"** ou faça
```
POST /webhook/pix/test/mark-paid/<order_id>
```
- Produção: configure seu PSP para chamar `POST /webhook/pix` com o status do pagamento.

Pronto!