import { createRoot } from 'react-dom/client';
import Portal from './Portal';
import './ds/styles.css';
import './portal.css';
import './pseudo.css';

// As opções de diagnóstico ficam disponíveis na entrada de desenvolvimento do comparador.
const query = new URLSearchParams(import.meta.env.DEV ? location.search : '');
const opcao = (nome: string, padrao: string, options: string[]) => {
  const valor = query.get(nome);
  return valor !== null && options.includes(valor) ? valor : padrao;
};

createRoot(document.getElementById('dc-root')!).render(
  <Portal
    inicio={query.has('inicio') || query.has('iaEstado') ? opcao('inicio', query.has('iaEstado') ? 'Escola' : 'Apresentação', ["Apresentação", "Login", "Primeiro acesso", "Escola", "Professor", "Professor · sem permissão", "Aluno", "Escola · horários do professor", "Escola · assistente vazio", "Escola · assistente com proposta", "Escola · assistente com erro"]) : undefined}
    dispositivo={opcao('dispositivo', 'Desktop', ['Desktop', 'Celular'])}
    funcoesEstilo={opcao('funcoesEstilo', 'Tinta', ['Tinta', 'Espiral'])}
    relogio={opcao('relogio', 'Ao vivo', ['Ao vivo', 'Terça 08:40', 'Quarta 10:20', 'Quinta 14:00'])}
    iaEstado={opcao('iaEstado', 'Conversa livre', ["Conversa livre", "Vazio", "Enviando", "Só texto", "Com proposta", "Com \"Não coube\"", "Aplicando", "Aplicada", "Erro: não configurado", "Erro: limite de uso", "Erro: sem conexão"])}
    iaErroSimulado={opcao('iaErroSimulado', 'Nenhum', ['Nenhum', 'Não configurado', 'Limite de uso', 'Sem conexão'])}
    estado="Normal"
    vista="Protótipo"
    fonte="Apple · SF + New York"
    movimento={opcao('movimento', 'Seguir o sistema', ['Seguir o sistema', 'Completo', 'Reduzido'])}
  />,
);
