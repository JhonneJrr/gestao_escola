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
    inicio={query.has('inicio') || query.has('iaEstado') ? opcao('inicio', query.has('iaEstado') ? 'Escola' : 'Apresentação', ["Apresentação", "Login", "Primeiro acesso", "Escola", "Professor", "Professor · sem permissão", "Aluno", "Escola · horários do professor", "Escola · assistente vazio", "Escola · assistente com proposta", "Escola · assistente com erro", "Escola / Grade e agenda / Carregando", "Escola / Grade e agenda / Erro ao carregar", "Escola / Aula / Chamada de hoje", "Escola / Aula / Chamada feita", "Escola / Aula / Aula futura", "Escola / Aula / Feriado", "Escola / Aula / Cancelada", "Escola / Aula / Semestre encerrado", "Escola / Chamada / Aberta", "Escola / Chamada / Salvando", "Escola / Chamada / Erro de gravação", "Professor / Aula / Chamada de hoje", "Escola / Remarcação / Salvando", "Escola / Remarcação / Erro de gravação", "Escola / Disciplina / Salvando", "Escola / Disciplina / Erro de gravação", "Escola / Disciplina / Sem turma e sem sala", "Escola / Quadro / Sem turma e sem sala", "Escola / Quadro / Vazio", "Escola / Evento / Salvando", "Escola / Evento / Erro de gravação", "Escola / Pedidos / Aprovando", "Escola / Pedidos / Erro de gravação", "Professor / Pedido / Salvando", "Professor / Pedido / Erro de gravação", "Professor / Sugestão / Salvando", "Escola / Assistente / Enviando", "Escola / Assistente / Só texto", "Escola / Assistente / Proposta com Não coube", "Escola / Assistente / Aplicando", "Escola / Assistente / Erro: não configurado", "Escola / Assistente / Erro: limite de uso", "Escola / Assistente / Erro: sem conexão", "Escola / Nova turma", "Escola / Nova sala", "Escola / Nova turma / Já cadastrada", "Escola / Reverter / Confirmar", "Escola / Reverter / Salvando", "Escola / Reverter / Erro de gravação", "Escola / Disciplinas / Editor da Grade e agenda"]) : undefined}
    dispositivo={opcao('dispositivo', 'Desktop', ['Desktop', 'Celular'])}
    funcoesEstilo={opcao('funcoesEstilo', 'Tinta', ['Tinta', 'Espiral'])}
    relogio={opcao('relogio', 'Ao vivo', ['Ao vivo', 'Terça 08:40', 'Quarta 10:20', 'Quinta 14:00'])}
    iaEstado={opcao('iaEstado', 'Conversa livre', ["Conversa livre", "Vazio", "Enviando", "Só texto", "Com proposta", "Com \"Não coube\"", "Aplicando", "Aplicada", "Erro: não configurado", "Erro: limite de uso", "Erro: sem conexão"])}
    iaErroSimulado={opcao('iaErroSimulado', 'Nenhum', ['Nenhum', 'Não configurado', 'Limite de uso', 'Sem conexão'])}
    estado="Normal"
    vista="Protótipo"
    fonte="Apple · SF + New York"
    italico={opcao('italico', 'Sem itálico', ['Com itálico', 'Sem itálico'])}
    movimento={opcao('movimento', 'Seguir o sistema', ['Seguir o sistema', 'Completo', 'Reduzido'])}
  />,
);
