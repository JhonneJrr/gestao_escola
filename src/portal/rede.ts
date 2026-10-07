const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
let expirou: (() => void) | null = null;
export function aoExpirar(callback: (() => void) | null) { expirou = callback; }
export function guardarToken(token: string) { localStorage.setItem('portal.token', token); }
export function lerToken() { return localStorage.getItem('portal.token'); }
export function apagarToken() { localStorage.removeItem('portal.token'); }

async function pedir(caminho: string, corpo?: object) {
  const token = lerToken();
  let resposta: Response;
  try {
    resposta = await fetch(baseURL + caminho, {
      method: corpo ? 'POST' : 'GET',
      headers: {
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
        ...(caminho !== '/auth/login' && token ? { Authorization: 'Bearer ' + token } : {}),
      },
      ...(corpo ? { body: JSON.stringify(corpo) } : {}),
    });
  } catch (erro) { throw { status: 0, detalhe: (erro as Error).message }; }
  const dados = await resposta.json();
  if (!resposta.ok) {
    if (resposta.status === 401 && caminho !== '/auth/login' && caminho !== '/auth/trocar-senha') {
      apagarToken(); expirou?.();
    }
    throw { status: resposta.status, detalhe: Array.isArray(dados.detail) ? dados.detail.map((e: { msg: string }) => e.msg).join('; ') : dados.detail };
  }
  return dados;
}

export const login = (email: string, senha: string) => pedir('/auth/login', { email, senha });
export const me = () => pedir('/auth/me');
export const estado = () => pedir('/portal/estado');
export const trocarSenha = (senhaAtual: string, senhaNova: string) => pedir('/auth/trocar-senha', { senha_atual: senhaAtual, senha_nova: senhaNova });
