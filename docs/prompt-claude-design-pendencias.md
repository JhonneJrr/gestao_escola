Trabalhe no canvas existente **Portal Escolar** e no componente **Grade e Agenda**, com o mesmo idioma visual de hoje (tokens, tipografia, molas, painéis laterais, linhas e mensagens em linha). Não redesenhe nada que não esteja listado abaixo: o código do site é gerado dos dois arquivos e comparado com eles elemento por elemento, então qualquer mudança fora do pedido aparece como diferença.

Contexto: o site agora roda com dados reais de um servidor. Isso trouxe lacunas que o canvas, feito com dados fictícios, não cobre. Elas estão em ordem de importância. Para cada item, acrescente os estados novos ao canvas (e à lista de estados de início, para eu poder abrir cada um direto), usando nomes como "Escola / Grade e agenda / Carregando".

## 1. Chamada: atalho no painel da aula (opcional)

CORREÇÃO: a chamada NÃO ficou sem entrada. Ela continua acessível pelo Painel do professor ("Fazer chamada" nas aulas de hoje) e pela página da disciplina, na sub-aba **Chamada**. O que falta é só um atalho na tela "Grade e agenda", para quem já está olhando a aula no quadro.

- No painel "Aula" (o que abre ao clicar numa aula no Quadro semanal ou na visão Dia) acrescente o botão **Fazer chamada** para **Escola** e **Professor**, nas aulas de grade e nas aulas extras aprovadas. Ele abre o mesmo painel de chamada que já existe, com a data e a disciplina daquela aula.
- Estados: aula futura (desabilitado, "A chamada abre no dia da aula."), aula de hoje ou passada (habilitado), aula cancelada ou em feriado (desabilitado, "Aula cancelada." / "Sem aula: <feriado>."), semestre encerrado (desabilitado, mesma mensagem que o portal já usa).
- Quando a chamada já foi feita, o botão vira **Ver chamada** e a linha da aula, na visão Dia, mostra "Chamada feita" ao lado de "Dada".
- Aluno não vê o botão.

## 2. Carregando, salvando e erro do servidor

Hoje a tela supõe que tudo é instantâneo. Com o servidor real existem esperas e falhas. Desenhe, com os mesmos componentes que o portal já tem (por exemplo o `EstadoLista` para esqueleto e erro):

- **Carregando** a tela Grade e agenda (esqueleto do Quadro, do Ano, das Disciplinas e dos Pedidos).
- **Erro ao carregar**, com a mensagem "Não consegui carregar a grade e a agenda." e o botão **Tentar de novo**.
- **Salvando**: o botão principal de cada gravação mostra "Salvando…" e fica desabilitado. Vale para: Confirmar remarcação (painel de confirmação do arrastar), Salvar disciplina, Salvar evento, Enviar pedido, Aprovar / Recusar / Sugerir (escola) e Aceitar / Recusar sugestão (professor), Aplicar proposta do assistente.
- **Erro de gravação** em linha, no mesmo lugar onde hoje aparecem as mensagens de choque, com o texto "Não consegui salvar. Confira a conexão e tente de novo." (o servidor também devolve mensagens específicas de choque, no formato que o canvas já usa, e elas aparecem no mesmo lugar).

## 3. Assistente do Quadro: erros e conversa real

O assistente da aba Quadro (escola) só tem o caminho feliz. O assistente real pode falhar, e o do Portal (tela Disciplinas) já tem os estados. Alinhe o do Quadro com ele, sem trocar o seu formato de proposta (movimentos tracejados no quadro):

- Estado **enviando** com o texto "Conferindo a grade e os horários ocupados…".
- Três erros, com o botão **Tentar de novo**: "O assistente não está configurado neste servidor.", "O assistente atingiu o limite de uso. Tente de novo em alguns minutos." e "Não consegui falar com o assistente. Tente de novo."
- Resposta só com texto (sem proposta).
- Proposta com a lista **Não coube** (disciplina e motivo), no mesmo padrão do assistente do Portal.

## 4. Disciplina sem turma ou sem sala

Os dados reais podem ter disciplinas sem turma ou sem sala, e hoje o canvas sempre supõe os dois.

- No Quadro, nos filtros, no painel da aula, na lista de Disciplinas e nos Pedidos: como aparece "sem turma" e "sem sala" (sugestão: "Sem turma" e "Sem sala", na cor de texto suave).
- No editor de disciplina: a opção vazia "Sem turma" e "Sem sala" nos seletores.
- **Quadro vazio**: quando nenhuma disciplina tem horário, uma mensagem no lugar da grade ("Nenhuma aula na grade. Monte os horários ou peça ao assistente.").

## 5. Dois editores de disciplina

Existem hoje dois lugares para criar e editar disciplina: o painel da tela **Disciplinas** do Portal (sem turma nem sala) e a aba **Disciplinas** da Grade e agenda (com turma, sala e sala por horário). Escolha uma destas e desenhe:

- (a) Acrescentar turma, sala e sala por horário ao painel da tela Disciplinas do Portal, igual ao da Grade e agenda; ou
- (b) Manter só o editor da Grade e agenda e fazer o botão "Nova disciplina" e "Editar" da tela Disciplinas levarem para ele.

Diga qual escolheu.

## 6. Turmas e salas (opcional)

Hoje turmas e salas só existem se o sistema as cria; a escola não consegue cadastrar uma turma ou sala nova pela interface. Se quiser, desenhe apenas a criação: um painel simples "Nova turma" e "Nova sala" (só o nome, com erro "Turma já cadastrada." / "Sala já cadastrada."), acessível pela aba Disciplinas da Grade e agenda. Não precisa de edição nem exclusão.

## 7. Desfazer (decidir)

Depois de remarcar ou aplicar a proposta, o canvas oferece **Desfazer**. Com gravação real no servidor, desfazer é uma segunda gravação que pode falhar. Escolha: remover o Desfazer do canvas, ou trocá-lo por **Reverter** com confirmação e com os estados salvando e erro do item 2. Diga qual escolheu.

## Ao terminar

Responda com uma lista curta: o que foi acrescentado em cada item, o que decidiu nos itens 5 e 7, e confirme que nada fora desta lista mudou.
