# Fase 2 — Integração do front com a API real, login e rotas protegidas (Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O portal consome a API FastAPI real (axios + Bearer), com login, sessão persistida e rotas protegidas por perfil, sem `mock.ts`.

**Architecture:** `src/http.ts` (axios + interceptors) é a única porta para a rede; `src/api.ts` mantém as MESMAS assinaturas de hoje com miolo em axios (os componentes quase não mudam); `src/auth/` guarda a sessão (`localStorage`) e expõe `AuthContext`; `App.tsx` vira roteamento (React Router) com `ProtectedRoute` por perfil.

**Tech Stack:** React 19, Vite, TypeScript, axios, react-router-dom, playwright-core (teste de fumaça). Backend: FastAPI (repo `gestao-alunos`, `main` @ 90b9f77).

**Spec:** `docs/superpowers/specs/2026-10-05-fase2-integracao-front-design.md`

Desvios do spec (decididos aqui): (a) `TelaDashboard` continua usando `listarAlunos` + `situacaoDoAluno` + `avaliacoesSemNotaLancada` nesta fase (funciona com a API; N+1 pequeno); o `GET /dashboard` entra na Fase 3 junto com o dashboard novo; (b) `TelaCarregando`/`precarregar` são removidos e o "acordar a API" (`GET /`) roda na montagem da tela de login; (c) o teste de fumaça usa `playwright-core` com o Edge já instalado (`channel: "msedge"`), sem baixar navegador.

## Global Constraints

- Nenhum componente importa `mock.ts`; `mock.ts` é removido. Nenhuma chamada de rede fora de `src/http.ts`/`src/api.ts`/`AuthContext`.
- Contrato da API: JSON em `snake_case`; `matricula` é `string`; datas `YYYY-MM-DD`; erros chegam como `{"detail": "texto"}` (422: lista de `{msg,...}`).
- Rotas da API protegidas por Bearer; `POST /auth/login` e `GET /` são públicas.
- Perfis: `professor` (tudo) e `aluno` (só `/meu-painel`, que usa `GET /alunos/{id}`, boletim, frequência e `GET /avisos`). Aluno recebe 403 em `GET /alunos`, `GET /disciplinas/{id}/alunos`, etc.
- Código simples, nível de curso: sem biblioteca de estado, sem react-query; props tipadas por `interface`, sem `any`.
- Comentários só onde o "porquê" não é óbvio. Texto de UI em pt-br com acentos.
- Commits: 1 linha, sem acento, **sem Co-Authored-By nem menção a IA**. Sem push (o dono manda).
- UI nova (tela de login, estilo do botão Sair): por decisão do dono em 05/10, o CODEX implementa (exceção à regra de que front é do orquestrador). O orquestrador escreve a direção visual no briefing (a partir do `index.css` e da `TelaEntry` atuais) e VÊ as capturas de tela antes de aceitar.
- Ambiente: API local em `http://localhost:8000` (uvicorn, Postgres portátil `~/.pg16` porta 55432, `python seed.py --apagar-tudo` aplicado), front em `http://localhost:5173`. Logins demo: `prof@escola.com` e `ana@escola.com`, senha `escola123`.

## Review Focus

- `localStorage` com JSON corrompido ou vazio: abrir `/alunos` leva a `/login`, sem tela branca.
- 401 numa chamada protegida (token expirado/apagado): sessão limpa e volta a `/login`; o 401 do PRÓPRIO login NÃO redireciona (só mostra "E-mail ou senha incorretos").
- Aluno abrindo URL de professor (`/alunos`) cai em `/meu-painel`; professor abrindo `/meu-painel` cai em `/`.
- API fora do ar: o login mostra mensagem legível ("Não foi possível falar com o servidor..."), nunca tela branca nem "undefined".
- Erro 422 (lista de validação) vira texto legível, não `[object Object]`.
- F5 em `/alunos` mantém sessão e rota. Sair limpa a sessão e `/alunos` volta a pedir login.
- Usuário `aluno` sem `aluno_id` (dado inconsistente): `/meu-painel` mostra mensagem, não quebra.
- `listarAlunos`/`listarDisciplinas`/`listarAvisos` juntam TODAS as páginas (mais de 100 itens não são cortados).

---

### Task 1: Backend — `alunos.media` passa a ser real (repo `gestao-alunos`)

**Files (repo `C:\Users\Administrator\Documents\gestao-alunos`, ramo novo `fase2-media` a partir de `main`):**
- Modify: `db.py` (`lancar_nota`, `excluir_disciplina`, helper novo), `tests/test_notas.py`, `tests/test_seed.py`

**Interfaces:**
- Produces: `db._recalcular_media(cursor, aluno_id)` (grava `alunos.media` = média simples das médias ponderadas por disciplina, só disciplinas com nota; sem nota = 0). `lancar_nota` e `excluir_disciplina` a chamam NA MESMA transação do que alteram.

- [ ] **Step 1: Criar o ramo e escrever os testes que falham**

Run: `git -C C:\Users\Administrator\Documents\gestao-alunos checkout -b fase2-media`

Acrescentar em `tests/test_notas.py` (usa `_cenario`, `_avaliacao` já existentes no arquivo):
```python
def test_lancar_nota_atualiza_a_media_do_aluno(cliente, prof):
    aluno, d = _cenario()
    p1 = _avaliacao(cliente, prof, d, "P1", 40).json()
    p2 = _avaliacao(cliente, prof, d, "P2", 60).json()
    java = db.inserir_disciplina("Java", 30)
    db.matricular(aluno["id"], java["id"])
    j1 = _avaliacao(cliente, prof, java, "J1", 100).json()

    def media():
        return cliente.get(f"/alunos/{aluno['id']}", headers=prof).json()["media"]

    def nota(avaliacao, valor):
        cliente.put(f"/avaliacoes/{avaliacao['id']}/notas/{aluno['id']}", json={"valor": valor}, headers=prof)

    assert media() == 0
    nota(p1, 10)
    assert media() == 10  # so Python, parcial: 10
    nota(p2, 5)
    assert media() == 7  # (10*40 + 5*60) / 100
    nota(j1, 9)
    assert media() == 8  # (7 + 9) / 2
    acima = cliente.get("/alunos?media_minima=8", headers=prof).json()
    abaixo = cliente.get("/alunos?media_minima=8.1", headers=prof).json()
    assert acima["total"] == 1 and abaixo["total"] == 0


def test_excluir_disciplina_recalcula_a_media(cliente, prof):
    aluno, d = _cenario()
    p1 = _avaliacao(cliente, prof, d, "P1", 100).json()
    java = db.inserir_disciplina("Java", 30)
    db.matricular(aluno["id"], java["id"])
    j1 = _avaliacao(cliente, prof, java, "J1", 100).json()
    cliente.put(f"/avaliacoes/{p1['id']}/notas/{aluno['id']}", json={"valor": 6}, headers=prof)
    cliente.put(f"/avaliacoes/{j1['id']}/notas/{aluno['id']}", json={"valor": 10}, headers=prof)
    assert cliente.get(f"/alunos/{aluno['id']}", headers=prof).json()["media"] == 8
    assert cliente.delete(f"/disciplinas/{java['id']}", headers=prof).status_code == 204
    assert cliente.get(f"/alunos/{aluno['id']}", headers=prof).json()["media"] == 6
    assert cliente.delete(f"/disciplinas/{d['id']}", headers=prof).status_code == 204
    assert cliente.get(f"/alunos/{aluno['id']}", headers=prof).json()["media"] == 0
```
Acrescentar no fim de `test_seed_cria_dados_navegaveis` em `tests/test_seed.py`:
```python
    assert cliente.get(f"/alunos/{ana['aluno_id']}", headers=prof).json()["media"] == 9
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `C:\Users\Administrator\.venvs\gestao-alunos\Scripts\python -m pytest tests/test_notas.py tests/test_seed.py -q`
Expected: FAIL nos 3 testes (media segue 0).

- [ ] **Step 3: Implementar em `db.py`**

Substituir `lancar_nota` (db.py:433) por:
```python
def _recalcular_media(cursor, aluno_id):
    # media do aluno = media simples das medias ponderadas de cada disciplina com nota
    cursor.execute(
        """
        UPDATE alunos SET media = COALESCE((
            SELECT AVG(media_disciplina) FROM (
                SELECT SUM(n.valor * a.peso)::float / SUM(a.peso) AS media_disciplina
                FROM notas n JOIN avaliacoes a ON a.id = n.avaliacao_id
                WHERE n.aluno_id = %s
                GROUP BY a.disciplina_id
            ) por_disciplina
        ), 0)
        WHERE id = %s
        """,
        (aluno_id, aluno_id),
    )


def lancar_nota(avaliacao_id, aluno_id, valor):
    conexao = conectar()
    try:
        cursor = conexao.cursor()
        cursor.execute(
            """
            INSERT INTO notas (avaliacao_id, aluno_id, valor) VALUES (%s, %s, %s)
            ON CONFLICT (avaliacao_id, aluno_id) DO UPDATE SET valor = EXCLUDED.valor
            """,
            (avaliacao_id, aluno_id, valor),
        )
        _recalcular_media(cursor, aluno_id)
        conexao.commit()
    finally:
        conexao.close()
```
Substituir `excluir_disciplina` (db.py:304) por (o helper acima fica DEFINIDO ABAIXO desta função no arquivo; Python resolve em tempo de chamada, então a ordem não importa):
```python
def excluir_disciplina(disciplina_id):
    conexao = conectar()
    try:
        cursor = conexao.cursor()
        cursor.execute("SELECT aluno_id FROM matriculas WHERE disciplina_id = %s", (disciplina_id,))
        alunos = [linha["aluno_id"] for linha in cursor.fetchall()]
        cursor.execute("DELETE FROM disciplinas WHERE id = %s", (disciplina_id,))
        excluido = cursor.rowcount > 0
        for aluno_id in alunos:
            _recalcular_media(cursor, aluno_id)
        conexao.commit()
        return excluido
    finally:
        conexao.close()
```

- [ ] **Step 4: Rodar a suíte inteira**

Run: `C:\Users\Administrator\.venvs\gestao-alunos\Scripts\python -m pytest -q` (exige o Postgres portátil de pé e o `.env`; se a conexão falhar, subir com `pg_ctl -D %USERPROFILE%\.pg16\data -o "-p 55432" start`).
Expected: tudo PASS (56 anteriores + 2 novos; o do seed ganhou uma asserção).

- [ ] **Step 5: Commit**
```bash
git add db.py tests
git commit -m "Grava a media real do aluno ao lancar nota e excluir disciplina"
```

---

### Task 2: Front — dependências, `http.ts`, sessão e `AuthContext`

**Files (repo `C:\Users\Administrator\Documents\gestao-alunos-frontend`, ramo `fase2-integracao`):**
- Modify: `package.json` (via npm), `src/vite-env.d.ts` (só se não existir `vite/client`)
- Create: `.env.development`, `src/http.ts`, `src/auth/sessao.ts`, `src/auth/AuthContext.tsx`, `src/auth/ProtectedRoute.tsx`

**Interfaces:**
- Produces (`auth/sessao.ts`): `interface Sessao { token: string; perfil: "professor" | "aluno"; aluno_id: number | null; email: string }`, `lerSessao(): Sessao | null`, `salvarSessao(s: Sessao): void`, `limparSessao(): void`.
- Produces (`http.ts`): `export const http` (instância axios) e a função `textoDoErro(erro: unknown): string` (exportada para uso futuro).
- Produces (`auth/AuthContext.tsx`): `AuthProvider({children})`, `useAuth(): { sessao: Sessao | null; entrar(email: string, senha: string): Promise<Sessao>; sair(): void }`.
- Produces (`auth/ProtectedRoute.tsx`): componente default `ProtectedRoute({ perfil })` (usa `Outlet`).

- [ ] **Step 1: Instalar dependências**

Run (na pasta do front): `npm install axios react-router-dom && npm install -D playwright-core`
Expected: `package.json` ganha `axios`, `react-router-dom` em `dependencies` e `playwright-core` em `devDependencies`; `package-lock.json` atualizado.

- [ ] **Step 2: `.env.development`**
```
VITE_API_URL=http://localhost:8000
```
(`.env.development` NÃO está no `.gitignore` e não tem segredo: pode ser versionado.)

- [ ] **Step 3: `src/auth/sessao.ts`**
```ts
export interface Sessao {
  token: string;
  perfil: "professor" | "aluno";
  aluno_id: number | null;
  email: string;
}

const CHAVE = "portal-escolar-sessao";

// localStorage pode estar bloqueado ou com lixo: nesses casos a pessoa so precisa logar de novo
export function lerSessao(): Sessao | null {
  try {
    const texto = localStorage.getItem(CHAVE);
    if (!texto) {
      return null;
    }
    const dados = JSON.parse(texto);
    if (typeof dados?.token !== "string" || (dados.perfil !== "professor" && dados.perfil !== "aluno")) {
      return null;
    }
    return dados as Sessao;
  } catch {
    return null;
  }
}

export function salvarSessao(sessao: Sessao): void {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(sessao));
  } catch {
    // sem storage: a sessao vive so enquanto a aba estiver aberta
  }
}

export function limparSessao(): void {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    // nada a limpar
  }
}
```

- [ ] **Step 4: `src/http.ts`**
```ts
import axios from "axios";
import { lerSessao, limparSessao } from "./auth/sessao";

export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL });

http.interceptors.request.use((config) => {
  const sessao = lerSessao();
  if (sessao) {
    config.headers.Authorization = `Bearer ${sessao.token}`;
  }
  return config;
});

export function textoDoErro(erro: unknown): string {
  if (axios.isAxiosError(erro)) {
    if (!erro.response) {
      return "Não foi possível falar com o servidor. Tente de novo em instantes.";
    }
    const detalhe = erro.response.data?.detail;
    if (typeof detalhe === "string") {
      return detalhe;
    }
    if (Array.isArray(detalhe)) {
      return detalhe.map((item) => item.msg).join("; ");
    }
  }
  return "Erro inesperado. Tente de novo.";
}

// Os componentes ja tratam erro como `(erro as Error).message`: aqui todo erro vira Error com texto legivel
http.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    const ehLogin = erro.config?.url === "/auth/login";
    if (axios.isAxiosError(erro) && erro.response?.status === 401 && !ehLogin) {
      limparSessao();
      window.location.assign("/login");
    }
    return Promise.reject(new Error(textoDoErro(erro)));
  }
);
```

- [ ] **Step 5: `src/auth/AuthContext.tsx`**
```tsx
import { createContext, useContext, useState, type ReactNode } from "react";
import { http } from "../http";
import { lerSessao, limparSessao, salvarSessao, type Sessao } from "./sessao";

interface AuthValor {
  sessao: Sessao | null;
  entrar: (email: string, senha: string) => Promise<Sessao>;
  sair: () => void;
}

const AuthContext = createContext<AuthValor | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(() => lerSessao());

  async function entrar(email: string, senha: string): Promise<Sessao> {
    const { data } = await http.post("/auth/login", { email: email.trim(), senha });
    const nova: Sessao = {
      token: data.access_token,
      perfil: data.perfil,
      aluno_id: data.aluno_id,
      email: email.trim().toLowerCase(),
    };
    salvarSessao(nova);
    setSessao(nova);
    return nova;
  }

  function sair() {
    limparSessao();
    setSessao(null);
  }

  return <AuthContext.Provider value={{ sessao, entrar, sair }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValor {
  const valor = useContext(AuthContext);
  if (valor === null) {
    throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  }
  return valor;
}
```

- [ ] **Step 6: `src/auth/ProtectedRoute.tsx`**
```tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthContext";

interface ProtectedRouteProps {
  perfil: "professor" | "aluno";
}

function ProtectedRoute({ perfil }: ProtectedRouteProps) {
  const { sessao } = useAuth();

  if (!sessao) {
    return <Navigate to="/login" replace />;
  }
  if (sessao.perfil !== perfil) {
    return <Navigate to={sessao.perfil === "aluno" ? "/meu-painel" : "/"} replace />;
  }
  return <Outlet />;
}

export default ProtectedRoute;
```

- [ ] **Step 7: Verificar**

Run: `npx tsc -b`
Expected: sem erro de tipo (se `import.meta.env.VITE_API_URL` reclamar de tipo, garantir `/// <reference types="vite/client" />` em `src/vite-env.d.ts`).

- [ ] **Step 8: Commit**
```bash
git add package.json package-lock.json .env.development src/http.ts src/auth
git commit -m "Adiciona axios, sessao e AuthContext"
```

---

### Task 3: Front — `api.ts` na API real, fim do mock

**Files:**
- Modify (reescrever): `src/api.ts`
- Delete: `src/mock.ts`, `src/components/TelaCarregando.tsx`
- Modify: `src/types.ts` (só o tipo `Tela`, Task 4 completa)

**Interfaces:**
- Consumes: `http` (Task 2).
- Produces (exports de `api.ts`, assinaturas IGUAIS às atuais, exceto as novas marcadas): `acordarApi(): Promise<void>` (NOVA), `buscarAluno(id: number): Promise<Aluno>` (NOVA), `listarAlunos(filtros?: FiltrosAluno)`, `criarAluno`, `excluirAluno`, `listarDisciplinas`, `listarDisciplinasComContagem`, `criarDisciplina`, `excluirDisciplina`, `disciplinasDoAluno`, `alunosDaDisciplina`, `matricular`, `listarAvaliacoes`, `criarAvaliacao`, `excluirAvaliacao`, `lancarNota`, `boletimDoAluno`, `avaliacoesSemNotaLancada`, `registrarChamada`, `aulasDaDisciplina`, `presencasDoDia`, `frequenciaDaTurma`, `frequenciaDoAluno`, `situacaoDoAluno`, `listarAvisos`, `criarAviso`, `excluirAviso`; tipos `NotaDaMateria`, `BoletimDaMateria`, `AvaliacaoPendente`, `AlunoComFrequencia`, `FrequenciaDaMateria`, `Situacao`. REMOVIDOS (nenhum componente os usa): `esperar`, `precarregar`, `mediaGeralDoAluno`, `frequenciaGeralDoAluno`.

- [ ] **Step 1: Reescrever `src/api.ts`**
```ts
import { http } from "./http";
import type {
  Aluno,
  AlunoEntrada,
  Aula,
  Avaliacao,
  Aviso,
  AvisoEntrada,
  Disciplina,
  DisciplinaComContagem,
  DisciplinaEntrada,
  FiltrosAluno,
} from "./types";

// ----------------------------- tipos que vem da API (formato dos componentes) -----------------------------

export interface NotaDaMateria {
  avaliacao: Avaliacao;
  valor: number | null;
}

export interface BoletimDaMateria {
  disciplina: Disciplina;
  notas: NotaDaMateria[];
  media: number | null;
  parcial: boolean;
}

export interface AvaliacaoPendente {
  disciplina: Disciplina;
  avaliacao: Avaliacao;
}

export interface AlunoComFrequencia extends Aluno {
  percentual: number | null;
}

export interface FrequenciaDaMateria {
  disciplina: Disciplina;
  percentual: number | null;
}

export interface Situacao {
  mediaGeral: number | null;
  frequenciaGeral: number | null;
  aprovado: boolean | null;
}

interface Pagina<T> {
  itens: T[];
  total: number;
  pagina: number;
  tamanho: number;
}

// A API entrega listas em paginas de no maximo 100 itens; os seletores do portal precisam da lista inteira
async function todasAsPaginas<T>(caminho: string, params: Record<string, unknown> = {}): Promise<T[]> {
  const itens: T[] = [];
  let pagina = 1;
  while (true) {
    const { data } = await http.get<Pagina<T>>(caminho, { params: { ...params, pagina, tamanho: 100 } });
    itens.push(...data.itens);
    if (data.itens.length === 0 || itens.length >= data.total) {
      return itens;
    }
    pagina += 1;
  }
}

// ----------------------------- infraestrutura -----------------------------

// Acorda a API (o plano gratuito da nuvem dorme): erro aqui nao importa
export async function acordarApi(): Promise<void> {
  try {
    await http.get("/");
  } catch {
    // so aquecimento
  }
}

// ----------------------------- alunos -----------------------------

export async function listarAlunos(filtros?: FiltrosAluno): Promise<Aluno[]> {
  return todasAsPaginas<Aluno>("/alunos", {
    q: filtros?.q === "" ? undefined : filtros?.q,
    idade_minima: filtros?.idade_minima,
    media_minima: filtros?.media_minima,
  });
}

export async function buscarAluno(id: number): Promise<Aluno> {
  const { data } = await http.get<Aluno>(`/alunos/${id}`);
  return data;
}

export async function criarAluno(dados: AlunoEntrada): Promise<Aluno> {
  const { data } = await http.post<Aluno>("/alunos", dados);
  return data;
}

export async function excluirAluno(id: number): Promise<void> {
  await http.delete(`/alunos/${id}`);
}

// ----------------------------- disciplinas -----------------------------

export async function listarDisciplinas(): Promise<Disciplina[]> {
  return todasAsPaginas<Disciplina>("/disciplinas");
}

export async function listarDisciplinasComContagem(): Promise<DisciplinaComContagem[]> {
  const disciplinas = await listarDisciplinas();
  return Promise.all(
    disciplinas.map(async (disciplina) => {
      const alunos = await alunosDaDisciplina(disciplina.id);
      return { ...disciplina, totalAlunos: alunos.length };
    })
  );
}

export async function criarDisciplina(dados: DisciplinaEntrada): Promise<Disciplina> {
  const { data } = await http.post<Disciplina>("/disciplinas", dados);
  return data;
}

export async function excluirDisciplina(id: number): Promise<void> {
  await http.delete(`/disciplinas/${id}`);
}

export async function disciplinasDoAluno(alunoId: number): Promise<Disciplina[]> {
  const { data } = await http.get<Disciplina[]>(`/alunos/${alunoId}/disciplinas`);
  return data;
}

export async function alunosDaDisciplina(disciplinaId: number): Promise<Aluno[]> {
  const { data } = await http.get<Aluno[]>(`/disciplinas/${disciplinaId}/alunos`);
  return data;
}

export async function matricular(alunoId: number, disciplinaId: number): Promise<void> {
  await http.post(`/alunos/${alunoId}/matricular/${disciplinaId}`);
}

// ----------------------------- avaliacoes e notas -----------------------------

export async function listarAvaliacoes(disciplinaId: number): Promise<Avaliacao[]> {
  const { data } = await http.get<Avaliacao[]>(`/disciplinas/${disciplinaId}/avaliacoes`);
  return data;
}

export async function criarAvaliacao(disciplinaId: number, nome: string, peso: number): Promise<Avaliacao> {
  const { data } = await http.post<Avaliacao>(`/disciplinas/${disciplinaId}/avaliacoes`, { nome, peso });
  return data;
}

export async function excluirAvaliacao(id: number): Promise<void> {
  await http.delete(`/avaliacoes/${id}`);
}

export async function lancarNota(alunoId: number, avaliacaoId: number, valor: number): Promise<void> {
  await http.put(`/avaliacoes/${avaliacaoId}/notas/${alunoId}`, { valor });
}

export async function boletimDoAluno(alunoId: number): Promise<BoletimDaMateria[]> {
  const { data } = await http.get<BoletimDaMateria[]>(`/alunos/${alunoId}/boletim`);
  return data;
}

export async function avaliacoesSemNotaLancada(): Promise<AvaliacaoPendente[]> {
  const { data } = await http.get<AvaliacaoPendente[]>("/avaliacoes/pendentes");
  return data;
}

// ----------------------------- frequencia -----------------------------

export async function registrarChamada(
  disciplinaId: number,
  data: string,
  presencas: { aluno_id: number; presente: boolean }[]
): Promise<void> {
  await http.put(`/disciplinas/${disciplinaId}/chamada`, { data, presencas });
}

export async function aulasDaDisciplina(disciplinaId: number): Promise<Aula[]> {
  const { data } = await http.get<Aula[]>(`/disciplinas/${disciplinaId}/aulas`);
  return data;
}

export async function presencasDoDia(disciplinaId: number, data: string): Promise<Record<number, boolean>> {
  const resposta = await http.get<{ aluno_id: number; presente: boolean }[]>(
    `/disciplinas/${disciplinaId}/chamada`,
    { params: { data } }
  );
  const mapa: Record<number, boolean> = {};
  for (const item of resposta.data) {
    mapa[item.aluno_id] = item.presente;
  }
  return mapa;
}

export async function frequenciaDaTurma(disciplinaId: number): Promise<AlunoComFrequencia[]> {
  const { data } = await http.get<AlunoComFrequencia[]>(`/disciplinas/${disciplinaId}/frequencia`);
  return data;
}

export async function frequenciaDoAluno(alunoId: number): Promise<FrequenciaDaMateria[]> {
  const { data } = await http.get<FrequenciaDaMateria[]>(`/alunos/${alunoId}/frequencia`);
  return data;
}

// ----------------------------- situacao geral do aluno -----------------------------

interface SituacaoDaApi {
  media_geral: number | null;
  frequencia_geral: number | null;
  aprovado: boolean | null;
}

export async function situacaoDoAluno(alunoId: number): Promise<Situacao> {
  const { data } = await http.get<SituacaoDaApi>(`/alunos/${alunoId}/situacao`);
  return { mediaGeral: data.media_geral, frequenciaGeral: data.frequencia_geral, aprovado: data.aprovado };
}

// ----------------------------- avisos -----------------------------

export async function listarAvisos(): Promise<Aviso[]> {
  return todasAsPaginas<Aviso>("/avisos");
}

export async function criarAviso(dados: AvisoEntrada): Promise<Aviso> {
  const { data } = await http.post<Aviso>("/avisos", dados);
  return data;
}

export async function excluirAviso(id: number): Promise<void> {
  await http.delete(`/avisos/${id}`);
}
```

- [ ] **Step 2: Remover o mock e a tela de carregamento**

Run: `git rm src/mock.ts src/components/TelaCarregando.tsx`
Em `src/App.tsx`, remover o import de `TelaCarregando` e o `if (tela === "carregando") {...}` e o estado `destinoAposCarregar` — o `App.tsx` é REESCRITO na Task 4; aqui só garanta que nada importe os arquivos apagados. Se o `tsc` falhar SÓ por causa do `App.tsx`/`TelaEntry` (`precarregar`, `TelaCarregando`), deixe para a Task 4 e anote no relatório.

- [ ] **Step 3: Verificar**

Run: `npx tsc -b 2>&1 | Select-String "error" | Select-Object -First 20`
Expected: nenhum erro fora de `src/App.tsx` (os erros do `App.tsx` somem na Task 4). Nenhuma referência restante a `mock`, `esperar`, `precarregar`: `Select-String -Path src -Pattern "mock|esperar|precarregar" -Recurse` deve vir vazio.

- [ ] **Step 4: Commit**
```bash
git add -A src
git commit -m "Troca o mock da api.ts por chamadas reais com axios"
```

---

### Task 4: Front — React Router, rotas protegidas, Cabeçalho e painel do aluno

**Files:**
- Modify: `src/main.tsx`, `src/App.tsx` (reescrever), `src/types.ts` (tipo `Tela`), `src/components/Cabecalho.tsx`, `src/components/TelaModoAluno.tsx`
- (`TelaEntry` continua existindo até a Task 5, que o substitui por `TelaLogin`.)

**Interfaces:**
- Consumes: `useAuth`, `ProtectedRoute` (Task 2); `buscarAluno`, `acordarApi` (Task 3).
- Produces: `Cabecalho({ email, aoIrParaHome, aoSair })`; `TelaModoAluno()` SEM props; `src/components/TelaLogin.tsx` é importado por `App.tsx` (criado na Task 5; para compilar esta task, crie antes um `TelaLogin` mínimo que a Task 5 substitui — ver Step 5).

- [ ] **Step 1: `src/types.ts` — tipo `Tela`** (no fim do arquivo)
```ts
export type Tela =
  | "home"
  | "alunos"
  | "disciplinas"
  | "matriculas"
  | "dashboard"
  | "boletim"
  | "frequencia"
  | "avisos"
  | "modoAluno";
```

- [ ] **Step 2: `src/main.tsx`**
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { AuthProvider } from "./auth/AuthContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
```

- [ ] **Step 3: `src/App.tsx` (reescrever)**
```tsx
import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { Tela } from "./types";
import { useAuth } from "./auth/AuthContext";
import ProtectedRoute from "./auth/ProtectedRoute";
import Cabecalho from "./components/Cabecalho";
import PainelAlunos from "./components/PainelAlunos";
import TelaAvisos from "./components/TelaAvisos";
import TelaBoletim from "./components/TelaBoletim";
import TelaDashboard from "./components/TelaDashboard";
import TelaDisciplinas from "./components/TelaDisciplinas";
import TelaFrequencia from "./components/TelaFrequencia";
import TelaHome from "./components/TelaHome";
import TelaLogin from "./components/TelaLogin";
import TelaMatriculas from "./components/TelaMatriculas";
import TelaModoAluno from "./components/TelaModoAluno";

interface OrigemTransicao {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

interface ContextoLayout {
  abrirComTransicao: (novaTela: Tela, evento: React.MouseEvent<HTMLButtonElement>) => void;
}

function caminhoDe(tela: Tela): string {
  if (tela === "home") {
    return "/";
  }
  if (tela === "modoAluno") {
    return "/meu-painel";
  }
  return `/${tela}`;
}

// Moldura das telas logadas: cabecalho + animacao de transicao
function LayoutPortal() {
  const navigate = useNavigate();
  const { sessao, sair } = useAuth();
  const [transicao, setTransicao] = useState<OrigemTransicao | null>(null);

  function abrirComTransicao(novaTela: Tela, evento: React.MouseEvent<HTMLButtonElement>) {
    const retangulo = evento.currentTarget.getBoundingClientRect();
    setTransicao({
      x: retangulo.left,
      y: retangulo.top,
      largura: retangulo.width,
      altura: retangulo.height,
    });
    window.setTimeout(() => navigate(caminhoDe(novaTela)), 360);
    window.setTimeout(() => setTransicao(null), 800);
  }

  const inicio = sessao?.perfil === "aluno" ? "/meu-painel" : "/";

  return (
    <div className="pagina">
      {transicao && (
        <div
          className="transicao-card"
          style={
            {
              "--origem-x": `${transicao.x}px`,
              "--origem-y": `${transicao.y}px`,
              "--origem-w": `${transicao.largura}px`,
              "--origem-h": `${transicao.altura}px`,
            } as React.CSSProperties
          }
        ></div>
      )}

      <Cabecalho
        email={sessao?.email ?? ""}
        aoIrParaHome={() => navigate(inicio)}
        aoSair={() => {
          sair();
          navigate("/login");
        }}
      />
      <Outlet context={{ abrirComTransicao } satisfies ContextoLayout} />
    </div>
  );
}

function HomeRota() {
  const { abrirComTransicao } = useOutletContext<ContextoLayout>();
  return <TelaHome aoAbrirTela={abrirComTransicao} />;
}

function App() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const irParaHome = () => navigate("/");

  useEffect(() => {
    if (pathname !== "/alunos") {
      document.title = "Portal de Gestão Escolar";
    }
  }, [pathname]);

  return (
    <Routes>
      <Route path="/login" element={<TelaLogin />} />

      <Route element={<ProtectedRoute perfil="professor" />}>
        <Route element={<LayoutPortal />}>
          <Route index element={<HomeRota />} />
          <Route path="alunos" element={<PainelAlunos aoVoltar={irParaHome} />} />
          <Route path="disciplinas" element={<TelaDisciplinas aoVoltar={irParaHome} />} />
          <Route path="matriculas" element={<TelaMatriculas aoVoltar={irParaHome} />} />
          <Route path="dashboard" element={<TelaDashboard aoVoltar={irParaHome} />} />
          <Route path="boletim" element={<TelaBoletim aoVoltar={irParaHome} />} />
          <Route path="frequencia" element={<TelaFrequencia aoVoltar={irParaHome} />} />
          <Route path="avisos" element={<TelaAvisos aoVoltar={irParaHome} />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute perfil="aluno" />}>
        <Route element={<LayoutPortal />}>
          <Route path="meu-painel" element={<TelaModoAluno />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
```

- [ ] **Step 4: `src/components/Cabecalho.tsx`** — novas props e lado direito (o estilo visual de `.cabecalho-usuario` e `.botao-sair` é feito pelo orquestrador na Task 5; use SÓ estas classes)
```tsx
interface CabecalhoProps {
  email: string;
  aoIrParaHome: () => void;
  aoSair: () => void;
}

function Cabecalho({ email, aoIrParaHome, aoSair }: CabecalhoProps) {
  return (
    <header className="cabecalho">
      <h1>
        <button type="button" onClick={aoIrParaHome} aria-label="Ir para a Home">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"></path>
            <path d="M22 10v6"></path>
            <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"></path>
          </svg>
        </button>
        <span className="somente-leitura">Portal de Gestão Escolar</span>
      </h1>
      <div className="cabecalho-sessao">
        <span className="cabecalho-usuario">{email}</span>
        <button className="botao-sair" type="button" onClick={aoSair}>
          Sair
        </button>
      </div>
    </header>
  );
}

export default Cabecalho;
```

- [ ] **Step 5: `TelaModoAluno` — painel do próprio aluno**

Em `src/components/TelaModoAluno.tsx`:
1. Trocar imports: remover `BotaoVoltar`, `SeletorAlunos`, `listarAlunos` e as props; adicionar `import { useAuth } from "../auth/AuthContext";` e `buscarAluno`.
2. Substituir o início do componente (da assinatura até o `const alunoSelecionado = ...`) por:
```tsx
function TelaModoAluno() {
  const { sessao } = useAuth();
  const alunoId = sessao?.aluno_id ?? null;

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [boletim, setBoletim] = useState<BoletimDaMateria[]>([]);
  const [frequencias, setFrequencias] = useState<FrequenciaDaMateria[]>([]);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      if (alunoId === null) {
        setErro("Este usuário não está ligado a um aluno.");
        setCarregando(false);
        return;
      }
      try {
        const [alunoCarregado, boletimCarregado, frequenciasCarregadas, avisosCarregados] = await Promise.all([
          buscarAluno(alunoId),
          boletimDoAluno(alunoId),
          frequenciaDoAluno(alunoId),
          listarAvisos(),
        ]);
        setAluno(alunoCarregado);
        setBoletim(boletimCarregado);
        setFrequencias(frequenciasCarregadas);
        setAvisos(avisosCarregados);
      } catch (e) {
        setErro((e as Error).message);
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, [alunoId]);
```
3. No JSX: título `<h2>Meu painel</h2>` (sem `BotaoVoltar`); remover o wrapper `<div className="tela-com-roster">` e o `<SeletorAlunos .../>`; trocar `alunoSelecionado` por `aluno`; remover o ramo `carregandoDetalhes` (o conteúdo de Boletim/Frequência/Avisos passa a ser renderizado direto dentro do `painel-matricula` quando `!carregando && erro === "" && aluno`). O JSX interno de boletim, frequência e avisos NÃO muda.

- [ ] **Step 6: `TelaLogin` mínimo para compilar (a Task 5 o substitui)**

Criar `src/components/TelaLogin.tsx`:
```tsx
function TelaLogin() {
  return <div>login</div>;
}

export default TelaLogin;
```

- [ ] **Step 7: Verificar**

Run: `npx tsc -b` e `npm run build`
Expected: ambos limpos. `TelaEntry.tsx` pode ficar sem uso por enquanto (o `tsc` não reclama de arquivo sem import).

- [ ] **Step 8: Commit**
```bash
git add -A src
git commit -m "Adiciona React Router, rotas protegidas e painel do aluno logado"
```

---

### Task 5: Tela de login e estilo da sessão (UI — Codex, com direção visual do orquestrador)

**Files:**
- Modify (reescrever): `src/components/TelaLogin.tsx`
- Modify: `src/index.css` (estilos de `.tela-login*`, `.cabecalho-sessao`, `.cabecalho-usuario`, `.botao-sair`; remover `.tela-entry*`/`.entry-*` se ficarem órfãos)
- Delete: `src/components/TelaEntry.tsx`

**Interfaces:**
- Consumes: `useAuth().entrar`, `acordarApi` (Task 3), mundo visual atual (`src/index.css`, `TelaEntry` antiga como referência).
- Produces (contrato para o teste de fumaça, NÃO mudar): campo com label acessível "E-mail", campo com label "Senha", botão "Entrar", e um elemento `role="alert"` com o texto do erro.

- [ ] **Step 1: Invocar a skill `impeccable`** (UI nova) e definir a direção no mundo visual atual do portal (ler `index.css` e a `TelaEntry` antes). Registrar a direção em 3 linhas no começo do commit body? NÃO — commit é 1 linha; a direção fica no relatório.

- [ ] **Step 2: Implementar `TelaLogin` com esta lógica (a casca visual é livre, o comportamento não)**
```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { acordarApi } from "../api";
import { useAuth } from "../auth/AuthContext";

function TelaLogin() {
  const { sessao, entrar } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // acorda a API enquanto a pessoa digita (plano gratuito da nuvem dorme)
  useEffect(() => {
    acordarApi();
  }, []);

  // quem ja tem sessao nao precisa ver o login
  useEffect(() => {
    if (sessao) {
      navigate(sessao.perfil === "aluno" ? "/meu-painel" : "/", { replace: true });
    }
  }, [sessao, navigate]);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const nova = await entrar(email, senha);
      navigate(nova.perfil === "aluno" ? "/meu-painel" : "/", { replace: true });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  // JSX: <form onSubmit={enviar}> com <label> "E-mail" + input type="email", <label> "Senha" + input type="password",
  // <button type="submit" disabled={enviando}>Entrar</button>, e {erro !== "" && <p role="alert">{erro}</p>};
  // mais um bloco discreto "Acessos de demonstração" com prof@escola.com e ana@escola.com (senha escola123).
}

export default TelaLogin;
```
(O JSX final segue a direção visual do briefing; todo o resto acima é fixo.)

- [ ] **Step 3: Estilo do cabeçalho logado** — `.cabecalho` vira flex com `.cabecalho-sessao` à direita; `.botao-sair` e `.cabecalho-usuario` no mundo visual atual; em celular o e-mail some antes de quebrar a linha.

- [ ] **Step 4: Remover `TelaEntry`**

Run: `git rm src/components/TelaEntry.tsx` e remover os estilos órfãos de `.tela-entry`/`.entry-*` do `index.css` (conferir com `Select-String -Path src -Pattern "tela-entry|entry-" -Recurse` que nada mais usa).

- [ ] **Step 5: Verificar e ver**

Run: `npx tsc -b && npm run build`; subir `npm run dev` e abrir `/login`, `/` (logado como professor) e `/meu-painel` (aluno) com o navegador do Playwright; **o orquestrador vê as capturas** (login, home com cabeçalho, painel do aluno, em 1280px e 390px) antes de aceitar; aperto/espaço solto volta ao Codex como correção.

- [ ] **Step 6: Commit**
```bash
git add -A src
git commit -m "Adiciona tela de login e botao sair no cabecalho"
```

---

### Task 6: Teste de fumaça no navegador, fecho e merge

**Files:**
- Create: `e2e/smoke.mjs`, `e2e/.gitignore` (conteúdo `saida/`)
- Modify: `package.json` (script `"smoke": "node e2e/smoke.mjs"`), `README.md` (como rodar front + API + smoke; link de produção "a definir na Fase 4")

**Interfaces:**
- Consumes: contrato de acessibilidade do `TelaLogin` (Task 5): labels "E-mail" e "Senha", botão "Entrar", `role="alert"`; botão "Sair" do `Cabecalho`; texto "Ana Souza" na lista de alunos e no painel do aluno.

- [ ] **Step 1: `e2e/smoke.mjs`**
```js
// Teste de fumaca: login real contra a API local, rotas protegidas e Bearer indo na rede.
// Pre-requisitos: API em :8000 com seed aplicado e front em :5173 (npm run dev).
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const FRONT = process.env.FRONT_URL ?? "http://localhost:5173";
const API = process.env.API_URL ?? "http://localhost:8000";
mkdirSync("e2e/saida", { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const chamadas = [];
page.on("request", (r) => {
  if (r.url().startsWith(API)) {
    chamadas.push({ metodo: r.method(), url: r.url(), auth: r.headers()["authorization"] ?? null });
  }
});
const errosDeConsole = [];
page.on("console", (m) => {
  // 401/403 esperados aparecem como "Failed to load resource"
  if (m.type() === "error" && !m.text().includes("Failed to load resource")) {
    errosDeConsole.push(m.text());
  }
});

function conferir(condicao, mensagem) {
  if (!condicao) {
    throw new Error(`FALHOU: ${mensagem}`);
  }
  console.log(`ok - ${mensagem}`);
}

async function logar(email, senha) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(senha);
  await page.getByRole("button", { name: "Entrar" }).click();
}

try {
  // 1) sem sessao, rota protegida manda para o login
  await page.goto(`${FRONT}/alunos`);
  await page.waitForURL("**/login");
  conferir(true, "sem sessao, /alunos redireciona para /login");

  // 2) senha errada: mensagem de erro e continua no login
  await logar("prof@escola.com", "errada");
  await page.getByRole("alert").waitFor();
  conferir(page.url().endsWith("/login"), "senha errada continua em /login");
  conferir((await page.getByRole("alert").innerText()).length > 0, "senha errada mostra mensagem");

  // 3) login do professor chega em / e /alunos lista com Bearer
  await page.getByLabel("Senha").fill("escola123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(`${FRONT}/`);
  const login = chamadas.find((c) => c.url.endsWith("/auth/login"));
  conferir(login && login.auth === null, "POST /auth/login vai SEM Authorization");
  await page.goto(`${FRONT}/alunos`);
  await page.getByText("Ana Souza").first().waitFor();
  const listagem = chamadas.filter((c) => c.metodo === "GET" && c.url.includes("/alunos")).pop();
  conferir(listagem && listagem.auth?.startsWith("Bearer "), "GET /alunos vai com Authorization: Bearer");
  await page.screenshot({ path: "e2e/saida/alunos-professor.png" });

  // 4) F5 mantem sessao e rota
  await page.reload();
  await page.getByText("Ana Souza").first().waitFor();
  conferir(page.url().endsWith("/alunos"), "F5 em /alunos mantem sessao e rota");

  // 5) Sair limpa a sessao
  await page.getByRole("button", { name: "Sair" }).click();
  await page.waitForURL("**/login");
  await page.goto(`${FRONT}/alunos`);
  await page.waitForURL("**/login");
  conferir(true, "depois de Sair, /alunos volta a pedir login");

  // 6) localStorage com lixo: cai no login, sem tela branca
  await page.evaluate(() => localStorage.setItem("portal-escolar-sessao", "{lixo"));
  await page.goto(`${FRONT}/alunos`);
  await page.waitForURL("**/login");
  conferir(await page.getByRole("button", { name: "Entrar" }).isVisible(), "sessao corrompida cai no login");

  // 7) API fora do ar: mensagem legivel
  await page.route(`${API}/**`, (rota) => rota.abort());
  await logar("prof@escola.com", "escola123");
  await page.getByRole("alert").waitFor();
  const msg = await page.getByRole("alert").innerText();
  conferir(msg.includes("servidor"), `API fora do ar mostra mensagem legivel (${msg})`);
  await page.unroute(`${API}/**`);

  // 8) aluno: vai para /meu-painel e nao abre rota de professor
  await page.reload();
  await page.getByLabel("E-mail").fill("ana@escola.com");
  await page.getByLabel("Senha").fill("escola123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/meu-painel");
  await page.getByText("Ana Souza").first().waitFor();
  await page.screenshot({ path: "e2e/saida/painel-aluno.png" });
  await page.goto(`${FRONT}/alunos`);
  await page.waitForURL("**/meu-painel");
  conferir(true, "aluno em /alunos e redirecionado para /meu-painel");

  conferir(errosDeConsole.length === 0, `console sem erros (${errosDeConsole.join(" | ")})`);
  console.log("SMOKE OK");
} catch (erro) {
  await page.screenshot({ path: "e2e/saida/falha.png" }).catch(() => {});
  console.error(erro.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
```

- [ ] **Step 2: Rodar**

Pré-requisito: API reiniciada com o backend da Task 1 (`uvicorn main:app --port 8000` no repo `gestao-alunos`, ramo `fase2-media`, `python seed.py --apagar-tudo` já aplicado) e `npm run dev` no front.
Run: `npm run smoke`
Expected: todas as linhas `ok - ...` e `SMOKE OK`; exit 0. O orquestrador vê `e2e/saida/*.png`.

- [ ] **Step 3: README do front** — seção "Rodando com a API": subir Postgres/API, seed, `npm run dev`, `npm run smoke`, logins demo; "Link de produção: a definir na Fase 4".

- [ ] **Step 4: Commit**
```bash
git add e2e package.json README.md
git commit -m "Adiciona teste de fumaca do login e das rotas protegidas"
```

- [ ] **Step 5: Fecho (orquestrador)** — `npm run build` limpo; revisão ampla do branch pelo Codex (`revisao-branch` no front E no `fase2-media` do backend, triagem de achados como hipótese); correções; merge local de `fase2-media` em `main` do backend e de `fase2-integracao` em `main` do front, **sem push**.

---

## Self-review (feito)

- **Cobertura do spec:** `http.ts` + Bearer + 401 (T2); `api.ts` real sem mock (T3); `AuthContext`/sessão em `localStorage`/`ProtectedRoute`/rotas por perfil (T2, T4); `Cabecalho` com e-mail e Sair (T4); `TelaLogin` (T5); `alunos.media` no backend (T1); fumaça + build (T6). Desvios declarados no topo (dashboard na Fase 3, `TelaCarregando` removida, `playwright-core` + Edge).
- **Consistência de nomes:** `useAuth().entrar/sair/sessao`, `Sessao`, `acordarApi`, `buscarAluno`, `caminhoDe`, `ContextoLayout.abrirComTransicao` iguais entre tasks; contrato de acessibilidade do login (labels "E-mail"/"Senha", botão "Entrar", `role="alert"`) usado igual em T5 e T6.
- **Placeholders:** nenhum no comportamento; o JSX/CSS da `TelaLogin` segue a direção visual escrita no briefing da Task 5; a lógica e o contrato de acessibilidade estão fixados aqui.
- **Risco aberto:** `TelaDashboard` continua N+1 (poucos alunos); `listarDisciplinasComContagem` faz 1 chamada por disciplina; ambos aceitáveis nesta fase.
