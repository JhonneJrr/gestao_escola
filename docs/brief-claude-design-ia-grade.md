# Brief para o Claude Design: horários do professor e assistente de grade

Trabalho no canvas existente **Portal Escolar**. Não é um redesenho: são três acréscimos, no mesmo idioma visual, com os mesmos tokens, tipografia, molas e componentes que já existem (painel lateral, EditorDeGrade, LinhaDeGrade, mensagens em linha, botões). Tudo o que não está listado aqui continua exatamente como está, porque o código é gerado deste canvas e comparado com ele elemento por elemento.

Só o perfil **Escola** vê e usa o que está neste brief. Professor e Aluno não mudam.

## 1. Ficha do professor: horários ocupados

**Onde:** tela Professores. A linha de cada professor ganha um resumo curto e abre o painel lateral do professor.

**Na lista:** uma linha de resumo por professor, por exemplo `Ocupado: Ter 08:00–12:00 · Qui 13:30–17:10`, ou `Sem horários ocupados`.

**No painel lateral do professor:** seção nova "Horários ocupados", com a mesma construção do EditorDeGrade da disciplina:
- Linhas com dia da semana (segunda a sexta), início, fim e **motivo** (texto curto, por exemplo "Outra escola"), mais o remover.
- "Adicionar horário".
- Validação em linha, no mesmo padrão da LinhaDeGrade: fim depois do início; duas linhas do mesmo professor não podem se sobrepor.
- Salvar, com mensagem de sucesso em linha e mensagem de erro em linha.
- Estado vazio: texto explicando que, sem horários ocupados, o professor está livre na janela inteira da escola (segunda a sexta, 08:00 às 17:10).

**Texto de apoio da seção:** "A grade nunca marca aula deste professor dentro destes horários."

## 2. Choque ao salvar a grade (painel da disciplina que já existe)

Não há componente novo. O servidor agora recusa a grade que bate com um horário ocupado do professor ou com outra disciplina do mesmo professor, e a mensagem aparece no lugar de erro que a LinhaDeGrade já tem. Confira se cabem, sem quebrar o layout, mensagens deste tamanho:
- `Choca com um horário ocupado de Carlos Mendes (terça, 08:00–12:00: Outra escola).`
- `Carlos Mendes já dá Banco de Dados neste horário (terça, 08:00–09:40).`

A mesma mensagem pode aparecer ao trocar o professor de uma disciplina.

## 3. Assistente de grade (chat da IA)

**Onde:** tela Disciplinas. Um botão com ícone, "Assistente de grade", ao lado de "Nova disciplina". Abre um painel lateral novo, no mesmo padrão dos outros painéis (mesma largura, mesmo cabeçalho, mesmo fechar).

**O que o painel tem, de cima para baixo:**
1. Cabeçalho: "Assistente de grade" e uma linha de apoio: "Sugere horários sem choque. Você confere e aplica."
2. Conversa: mensagens da escola e respostas do assistente, em ordem. O visual das mensagens segue o portal (filetes, tipografia do sistema), não um aplicativo de mensagens genérico.
3. Quando a resposta traz uma **proposta**, ela aparece como um bloco próprio dentro da conversa:
   - Uma linha por disciplina: nome, professor e os horários propostos (`Seg 08:00–09:40 · Qua 08:00–09:40`).
   - Se houver itens recusados, uma lista separada "Não coube", com a disciplina e o motivo (por exemplo "Choca com um horário ocupado de Marta Ribeiro").
   - Ações: **Aplicar proposta** e **Descartar**.
4. Depois de aplicar: resultado por disciplina (`Python: 32 aulas geradas`) ou o erro daquela disciplina, sem perder a conversa.
5. Sugestões de primeira mensagem, visíveis só com a conversa vazia:
   - "Monte a grade das disciplinas que ainda estão sem horário."
   - "O professor Carlos só pode de manhã. Reorganize as disciplinas dele."
   - "Tem algum choque na grade atual?"
6. Rodapé fixo: campo de texto de várias linhas e o botão Enviar. Enter envia, Shift+Enter quebra linha.

**Estados que precisam existir no canvas:**
- Vazio (só as sugestões).
- Enviando (o assistente está respondendo; o campo fica desabilitado).
- Resposta só com texto.
- Resposta com proposta.
- Resposta com proposta e itens em "Não coube".
- Aplicando a proposta.
- Aplicada, com o resultado por disciplina.
- Erro, com três textos possíveis: "O assistente não está configurado neste servidor.", "O assistente atingiu o limite de uso. Tente de novo em alguns minutos." e "Não consegui falar com o assistente. Tente de novo."

**Acessibilidade e movimento:** foco vai para o campo de texto ao abrir; a conversa rola para a última mensagem; com movimento reduzido, as mensagens entram só com fade, como o resto do portal.

**Largura de celular:** o painel ocupa a tela inteira, como os outros painéis; o rodapé com o campo continua visível com o teclado aberto.

## Dados (para os nomes baterem com a API)

Dias da semana: `1` = segunda … `7` = domingo. Horas no formato `HH:MM`.

```js
// Horário ocupado de um professor
{ dia_semana: 2, hora_inicio: '08:00', hora_fim: '12:00', motivo: 'Outra escola' }

// Mensagem do chat
{ papel: 'usuario' | 'ia', texto: '...' }

// Resposta do assistente
{
  resposta: 'Encaixei as três disciplinas sem horário...',
  proposta: [
    { disciplina_id: 3, disciplina_nome: 'Algoritmos', professor_nome: 'Marta Ribeiro',
      itens: [{ dia_semana: 1, hora_inicio: '08:00', hora_fim: '09:40' }] }
  ],
  recusados: [
    { disciplina_id: 5, disciplina_nome: 'Redes', motivo: 'Choca com um horário ocupado de Marta Ribeiro.' }
  ]
}
```

## Nomes sugeridos na lógica do canvas

Seguindo o padrão que o canvas já usa (`fGrade`, `addLinha`, `setLinha`, `remLinha`, `pp.<tipo>`, `abrirPainel({ tipo })`):

- Horários do professor: estado `fOcup` (linhas `{ k, dia_semana, hora_inicio, hora_fim, motivo }`); ações `addOcup`, `setOcup`, `remOcup`, `salvarOcup`.
- Assistente: painel `tipo: 'ia'` (`pp.ia`); estado `iaMsgs`, `iaTexto`, `iaEnviando`, `iaErro`, `iaProposta`, `iaRecusados`, `iaAplicando`, `iaResultado`; ações `abrirIA`, `setIaTexto`, `enviarIA`, `usarSugestao`, `aplicarIA`, `descartarIA`.

## Dados fictícios do canvas

- Carlos Mendes: ocupado na terça, 08:00–12:00, "Outra escola".
- Marta Ribeiro: sem horários ocupados.
- Uma conversa de exemplo com uma proposta de duas disciplinas e um item em "Não coube", para os estados acima poderem ser abertos e comparados.

Se o canvas tiver a lista de estados de início (os mesmos usados para abrir cada tela direto), acrescente um para cada estado novo: painel do professor com horários, assistente vazio, assistente com proposta, assistente com erro.
