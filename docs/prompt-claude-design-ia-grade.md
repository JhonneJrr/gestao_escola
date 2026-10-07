Anexei o brief `brief-claude-design-ia-grade.md`. Leia ele inteiro antes de mexer em qualquer coisa.

Trabalhe no canvas que já existe, **Portal Escolar**. Não crie canvas novo e não redesenhe nada: são três acréscimos dentro do portal atual.

1. **Ficha do professor**: seção "Horários ocupados" no painel lateral do professor e um resumo por linha na lista de Professores.
2. **Choque ao salvar a grade**: sem componente novo; só confira se as mensagens novas do brief cabem no lugar de erro que a linha de grade já tem.
3. **Assistente de grade**: botão na tela Disciplinas que abre um painel lateral de conversa, com todos os estados listados no brief.

Regras que não podem ser quebradas:

- Use só o que o portal já tem: os mesmos tokens de cor, a mesma tipografia, as mesmas molas e os mesmos componentes (painel lateral, EditorDeGrade, LinhaDeGrade, botões, mensagens em linha). Se precisar de uma peça nova, ela nasce das peças existentes, com o mesmo acabamento.
- Não altere nenhuma tela, texto, espaçamento ou comportamento que o brief não cite. O código do site é gerado deste canvas e comparado com ele elemento por elemento; qualquer mudança fora do pedido aparece como diferença.
- Só o perfil Escola enxerga os acréscimos. Professor e Aluno ficam idênticos ao que são hoje.
- O chat segue o idioma visual do portal (filetes, hierarquia tipográfica, muito respiro), não o de um aplicativo de mensagens: sem balões coloridos, sem avatar de robô, sem gradiente, sem ícone de faísca.
- Mantenha o padrão da lógica do canvas: estado em campos como `fGrade`, painéis por `pp.<tipo>` e `abrirPainel({ tipo })`, ligações `{{ }}`. Use os nomes de estado e de ações sugeridos no brief, e os formatos de dados exatamente como estão lá.
- Dados fictícios: os do brief (Carlos Mendes ocupado na terça de manhã, Marta Ribeiro livre, e uma conversa de exemplo com proposta e um item em "Não coube").
- Todos os estados do brief precisam poder ser abertos no canvas: painel do professor com horários, assistente vazio, enviando, resposta só com texto, com proposta, com "Não coube", aplicando, aplicada e os três erros.
- Funciona na largura de celular e com movimento reduzido, como o resto do portal.

Quando terminar, me diga em uma lista curta o que foi acrescentado e confirme que nada fora do brief mudou.
