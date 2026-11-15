// Aba "Projeto Ascension": checklists diários (dias 1 a 31) por função, iguais à planilha.
export interface Projeto { key: 'crc' | 'comercial2' | 'avaliador' | 'gestor'; titulo: string; itens: string[] }

export const PROJETOS: Projeto[] = [
  {
    key: 'crc', titulo: 'PROJETO',
    itens: [
      'Preencher a planilha de acompanhamento',
      'Ligar até 3x por horário pros contatos do dia',
      'Assistir 1h de aula da Trilha',
      'Fazer resumo das aulas assistidas',
      'Enviar uma ligação para o dono analisar',
      'Ligar para o mesmo contato em outro horário',
      'Ligar para os agendados do dia lembrando da avaliação',
      'Ajudar o paciente achar a clínica (se precisar)',
      'Enviar como está fazendo follow up com quem não agendou ou faltou',
    ],
  },
  {
    key: 'comercial2', titulo: 'PROJETO - COMERCIAL 2',
    itens: [
      'Arquivar todos os contratos fechados do dia anterior',
      'Acompanhar até o paciente criar a recorrência de pagamentos.',
      'Entregar os comprovantes de pagamentos/dinheiro para o setor financeiro',
      'Verificar agenda diária do comercial e avaliação. Ligar ou enviar mensagem para os pacientes que não fecharam tratamento no dia anterior.',
      'Enviar mensagem de boas vindas e agradecimento aos pacientes  por escolher a clínica para realizar o tratamento e acompanhá-los. Fazer as anotações no sistema.',
      'Fazer acompanhamento dos pacientes que não fecharam tratamento no dia da avaliação. Realizar cadência de follow up com os leads não fechados. Deixar anotado no sistema o que foi conversado com o paciente.',
      'Pacientes de 3 a 6 meses sem comparecimento, o setor deverá entrar em contato e fazer o agendamento. Verificar sempre no sistema ou ficha do paciente.',
      'Deixar todos os documentos do setor organizados. (contratos e financeiro)',
      'Anotar e/ou bater o ponto de entrada e saída do trabalho.',
      'Acompanhar as entradas programas e fazer cobranças caso esteja inadimplente',
    ],
  },
  {
    key: 'avaliador', titulo: 'PROJETO - AVALIADOR(A)',
    itens: [
      'Revisão de Agendamentos', 'Recepção e Atendimento aos Pacientes', 'Avaliação Inicial do Paciente',
      'Discussão de Opções de Tratamento', 'Elaboração de Orçamentos Personalizados', 'Explicação de Procedimentos e Custos',
      'Resposta a Perguntas e Preocupações', 'Negociação de Termos Financeiros', 'Registro de Informações em Sistema',
      'Agendamento de Procedimentos', 'Follow-Up com Pacientes Anteriores', 'Colaboração com a Equipe Odontológica',
      'Participação em Treinamentos', 'Aprimoramento de Habilidades de Comunicação', 'Vídeo de confirmação dos agendamentos 1 por 1',
      'Orientação de opções de trabalho', 'Separa explicação de procedimentos de custos',
      'No custos: agregar valor e fazer negociação de forma de pagamento',
      'Elucidar dúvidas e minimizar preocupações, bem como transmitir confiança', 'Resolução de conflitos', 'Renegociação',
      'Consulta de finalização', 'Coletar prova social', 'Coletar indicações',
    ],
  },
  {
    key: 'gestor', titulo: 'PROJETO - DONO/GESTOR',
    itens: [
      'Revisar indicadores de desempenho da clínica (faturamento, fechamento, inadimplência, número de avaliações, taxa de conversão)',
      'Acompanhar metas semanais e mensais de cada setor',
      'Realizar reunião de alinhamento com líderes de equipe (avaliadores, comercial, financeiro, marketing)',
      'Validar estratégias de captação de novos pacientes',
      'Analisar retorno das campanhas de marketing com o responsável pelo setor',
      'Dar feedback sobre desempenho individual dos líderes e áreas',
      'Aprovar investimentos e compras relevantes',
      'Garantir que todos os setores estejam cumprindo os processos definidos',
      'Acompanhar e resolver demandas administrativas ou estruturais da clínica',
      'Manter relacionamento com parceiros e fornecedores estratégicos',
      'Supervisionar a experiência geral do paciente na clínica',
      'Revisar casos de pacientes importantes ou especiais (VIPs, indicações estratégicas)',
      'Participar de treinamentos ou eventos para atualização de gestão e odontologia',
      'Planejar e revisar ações de crescimento e expansão da clínica',
      'Realizar reuniões semanais com toda equipe para fortalecer cultura e senso de dono e motivação trazendo as estratégias necessárias para atingi mentor das metas',
    ],
  },
];

/** chave de uma marcação: projeto|item|dia */
export const checkKey = (projeto: string, item: number, dia: number) => `${projeto}|${item}|${dia}`;
