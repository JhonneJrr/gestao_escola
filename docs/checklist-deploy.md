# Checklist de deploy (hoje)

Não cole senhas nem a URL do banco em conversa, em arquivo do projeto ou em commit.

Antes de apresentar, abra o link do front e a API uma vez: no plano gratuito da Render, a API dorme e a primeira chamada leva de 30 a 60 segundos.

## 1. Render: criar a API e o banco

1. Entre em render.com.
2. Clique em **New > Blueprint**.
3. Escolha o repositório do back-end (`gestao-alunos`) e o ramo **main**. CONFERIR: o código do back está no GitHub, no ramo main (notas antigas do projeto dizem que ele não tinha sido enviado; confirme antes).
4. A Render lê o arquivo `render.yaml` e mostra o que vai criar: o banco `gestao-alunos-db` e o serviço `gestao-alunos-api` (Python, plano free). O `Dockerfile` não é usado pela Render.
5. Preencha só o que pede valor:
   - `GEMINI_API_KEY`: cole a chave do Gemini. CONFERIR: onde pegar a chave (não está nos arquivos). Sem ela, o assistente de grade responde erro 503, e o resto do sistema funciona.
   - `GEMINI_MODEL`: já vem pronto no `render.yaml` com o valor `gemini-3.5-flash,gemini-3.8-flash`. Se a tela pedir, use exatamente esse texto.
   - Não mexa em `SECRET_KEY` (a Render gera), em `DATABASE_URL` (a Render liga ao banco), em `CORS_ORIGINS` (já aponta para `https://gestao-escola.felipefelipejulio242.workers.dev`) nem em `PYTHON_VERSION` (3.13.4).
6. Confirme e espere o deploy terminar, com status "Live". CONFERIR: nome exato do botão de confirmação.
7. **URL da API:** abra o serviço `gestao-alunos-api` no painel. A URL pública aparece na página dele. CONFERIR: copie a URL do painel; não há endereço fixo nos arquivos. Anote sem barra no final.
   - Teste: abra `<URL da API>/` no navegador. Deve responder com status 200.
8. **External Database URL:** abra o banco `gestao-alunos-db` no painel da Render, copie o campo **External Database URL** (começa com `postgresql://`). Guarde só para o passo 2.

## 2. Rodar o seed no banco da Render

Atenção: o seed APAGA todas as tabelas do banco indicado. Rode uma vez, no banco da Render.

1. Abra o PowerShell.
2. Entre na pasta do back-end:
   ```powershell
   cd "C:\Users\Administrator\Documents\gestao-alunos"
   ```
3. Troque o texto entre aspas pela URL copiada no passo 1.8 e rode as duas linhas:
   ```powershell
   $env:DATABASE_URL = "COLE_A_EXTERNAL_DATABASE_URL_AQUI"
   & "C:\Users\Administrator\.venvs\gestao-alunos\Scripts\python.exe" seed.py --apagar-tudo
   ```
   O `db.py` lê a variável `DATABASE_URL`; se ela estiver definida, o seed usa o banco da Render.
4. Espere terminar, sem erro. CONFERIR: se der erro de conexão, os arquivos não dizem se a URL da Render precisa de parâmetro extra.
5. Login de demonstração: `escola@escola.com` com senha `escola123`.

## 3. Cloudflare: apontar o front para a API

1. Abra o projeto do front na Cloudflare (o site `gestao-escola`). CONFERIR: caminho exato no painel para as variáveis de build.
2. Crie uma **variável de build** chamada `VITE_API_URL` com a URL da API do passo 1.7, sem barra no final.
3. Refaça o deploy. A variável entra no site no momento do build, então sem novo build ela não faz efeito. CONFERIR: como disparar o novo deploy (o projeto está ligado ao ramo `main`).
   - Configuração de build que já está nos arquivos: comando `npm run build`, pasta de saída `dist`.
4. Link final do front: https://gestao-escola.felipefelipejulio242.workers.dev

## 4. Teste de fumaça (5 passos)

1. Abra https://gestao-escola.felipefelipejulio242.workers.dev. Deve aparecer a apresentação.
2. Vá em `/login` e entre com `escola@escola.com` e senha `escola123`. Deve abrir o Painel (`/painel`).
3. Confira se o Painel carrega com dados, sem tela de erro.
4. No menu, clique em **Acadêmico**. Deve aparecer o quadro semanal (`/agenda`).
5. Saia da conta (CONFERIR: onde fica o botão de sair) e entre com `ana@escola.com` e senha `escola123`. Deve abrir o Meu painel (`/meu-painel`), com notas e frequência da Ana.

Se alguma tela falhar logo no primeiro acesso, espere um minuto, recarregue e tente de novo: a API pode estar acordando.
