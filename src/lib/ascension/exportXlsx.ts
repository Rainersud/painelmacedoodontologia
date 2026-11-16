// Gera os dois arquivos XLSX da área ASCENSION com as mesmas abas, células, fórmulas,
// formatos e listas das planilhas originais — já preenchidos com os números do sistema.
// As fórmulas vão com o resultado calculado, então o arquivo abre certo no Excel,
// no Google Sheets e no celular, e recalcula se alguém mexer.
import type ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DailyRow, DashboardCells } from './acompanhamento';
import type { ControleRow, DiaRow, OrigemRow } from './controleGeral';
import { PROJETOS, checkKey } from './projetos';
import { CLINICA_OPTIONS } from '@/lib/clinicas';

const BRL = '[$R$ -416]#,##0.00';
const PCT = '0.00%';
const DATE = 'd/m/yyyy';
const NAVY = 'FF2A3990';

type Cell = ExcelJS.Cell;
const fill = (c: Cell, argb: string) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } }; };
const f = (formula: string, result: number | string | null) =>
  ({ formula, result: result === null ? '' : result }) as ExcelJS.CellFormulaValue;

/** Data "local" para o Excel (sem deslocamento de fuso). */
const xlDate = (d: Date) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

async function newBook() {
  const { default: Excel } = await import('exceljs');
  const wb = new Excel.Workbook();
  wb.creator = 'Painel Macedo Odontologia';
  wb.created = new Date();
  return wb;
}

export async function downloadWorkbook(wb: ExcelJS.Workbook, fileName: string) {
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------------------------------------------------------------------------
// 1) Rainer das Neves Macedo - Acompanhamento
// ---------------------------------------------------------------------------

const ADS_HEADERS = ['Date', 'Campaign Name', 'Adset Name', 'Ad Name', 'Action Link Clicks', 'Reach (Estimated)', 'Impressions',
  'Spend (Cost, Amount Spent)', 'Device Platform (Breakdown)', 'Publisher Platform (Breakdown)',
  'Action Messaging Conversations Started (Onsite Conversion)'];
const DAILY_HEADERS: [string, string, string][] = [
  // coluna, título, cor do cabeçalho
  ['M', 'Data', 'FFFFFFFF'],
  ['N', 'Todos os \nLeads', 'FFA4C2F4'],
  ['O', 'Nº de Leads Agendados', 'FFA4C2F4'],
  ['P', 'Avaliações p/ o dia ', 'FFA4C2F4'],
  ['Q', 'Nº de Faltas', 'FFA4C2F4'],
  ['R', 'Comparecimentos 🔐', 'FFA4C2F4'],
  ['S', 'Oportunidade de Vendas (R$)', 'FFB6D7A8'],
  ['T', 'Fechamentos do Dia (R$)', 'FFB6D7A8'],
  ['U', 'Nº de fechados no dia', 'FFB6D7A8'],
  ['V', 'Entrada', 'FFB6D7A8'],
  ['W', 'Ticket Médio (R$) 🔐', 'FFFFE599'],
  ['X', 'Conversão de agendamento 🔐', 'FFFFE599'],
  ['Y', 'Conversão de comparecimento 🔐', 'FFFFE599'],
  ['Z', 'Taxa de Fechamento 🔐', 'FFFFE599'],
  ['AA', 'Taxa de Entrada 🔐', 'FFFFE599'],
];

export interface AcompanhamentoExport {
  rows: DailyRow[];
  dashboard: DashboardCells;
  range: { start: Date; end: Date };
  /** mês dos checklists e marcações (projeto|item|dia) */
  checklistMonth: Date;
  checks: Set<string>;
}

export async function buildAcompanhamentoWorkbook(x: AcompanhamentoExport) {
  const wb = await newBook();

  // --- Acompanhamento Diario ---
  const ws = wb.addWorksheet('Acompanhamento Diario', { views: [{ state: 'frozen', ySplit: 1 }] });
  ADS_HEADERS.forEach((h, i) => { ws.getCell(1, i + 1).value = h; });
  DAILY_HEADERS.forEach(([col, h, color]) => {
    const c = ws.getCell(`${col}1`);
    c.value = h;
    c.font = { bold: true, color: { argb: NAVY } };
    c.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' };
    fill(c, color);
  });
  ws.getRow(1).height = 48;
  ws.getColumn('A').numFmt = DATE;
  ws.getColumn('M').numFmt = DATE;
  ws.getColumn('H').numFmt = '#,##0.00';
  ['S', 'T', 'V'].forEach(k => { ws.getColumn(k).numFmt = BRL; });
  ws.getColumn('W').numFmt = '[$R$]#,##0.00';
  ['X', 'Y', 'Z', 'AA'].forEach(k => { ws.getColumn(k).numFmt = PCT; });
  ['N', 'O', 'P', 'Q', 'R', 'U'].forEach(k => { ws.getColumn(k).numFmt = '#,##0'; });
  for (let i = 1; i <= 27; i++) ws.getColumn(i).width = i === 2 ? 30 : 13;
  ws.getColumn('W').width = 16.5;

  x.rows.forEach((r, i) => {
    const n = i + 2;
    // Colunas do anúncio (A:K): por enquanto o investimento do dia vem do CAC & Financeiro
    ws.getCell(`A${n}`).value = xlDate(r.date);
    ws.getCell(`B${n}`).value = 'Investimento (CAC & Financeiro)';
    ws.getCell(`H${n}`).value = Math.round(r.investimento * 100) / 100;
    ws.getCell(`M${n}`).value = xlDate(r.date);
    ws.getCell(`N${n}`).value = r.leads;
    ws.getCell(`O${n}`).value = r.agendados;
    ws.getCell(`P${n}`).value = r.avaliacoes;
    ws.getCell(`Q${n}`).value = r.faltas;
    ws.getCell(`R${n}`).value = r.comparecimentos;
    ws.getCell(`S${n}`).value = r.oportunidade;
    ws.getCell(`T${n}`).value = r.fechamentosValor;
    ws.getCell(`U${n}`).value = r.fechados;
    ws.getCell(`V${n}`).value = r.entrada;
    ws.getCell(`W${n}`).value = f(`IFERROR(T${n}/U${n},"")`, r.ticket);
    ws.getCell(`X${n}`).value = f(`IFERROR(O${n}/N${n},"")`, r.convAgendamento);
    ws.getCell(`Y${n}`).value = f(`IFERROR(R${n}/P${n},"")`, r.convComparecimento);
    ws.getCell(`Z${n}`).value = f(`IFERROR(T${n}/S${n},"")`, r.taxaFechamento);
    ws.getCell(`AA${n}`).value = f(`IFERROR(V${n}/T${n},"")`, r.taxaEntrada);
  });

  // --- Dashboard ---
  const d = wb.addWorksheet('Dashboard');
  const c = x.dashboard;
  const SRC = "'Acompanhamento Diario'";
  const per = (col: string, dateCol = 'M') => `SUMIFS(${SRC}!${col}:${col},${SRC}!${dateCol}:${dateCol},">="&$A$2,${SRC}!${dateCol}:${dateCol},"<="&$B$2)`;
  d.getCell('A1').value = 'Inicio';
  d.getCell('B1').value = 'Fim';
  d.getCell('C1').value = '👈🏼 Alterar periodo de analise aqui.';
  d.mergeCells('C1:F2');
  d.getCell('A2').value = xlDate(x.range.start);
  d.getCell('B2').value = xlDate(x.range.end);
  d.getCell('A2').numFmt = DATE;
  d.getCell('B2').numFmt = DATE;
  (d as unknown as { dataValidations: { add: (ref: string, v: ExcelJS.DataValidation) => void } }).dataValidations
    .add('A2:B2', { type: 'date', operator: 'greaterThan', formulae: [new Date(2000, 0, 1)], allowBlank: false });

  const label = (range: string, text: string) => {
    d.mergeCells(range);
    const cell = d.getCell(range.split(':')[0]);
    cell.value = text;
    fill(cell, 'FF000000');
    cell.font = { color: { argb: 'FFFFFFFF' }, size: 12 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  };
  const value = (range: string, v: ExcelJS.CellValue, numFmt: string) => {
    d.mergeCells(range);
    const cell = d.getCell(range.split(':')[0]);
    cell.value = v;
    cell.numFmt = numFmt;
    fill(cell, 'FFEBB949');
    cell.font = { size: 12 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  };
  label('G3:H3', 'Investimento');
  value('G4:H5', f(per('H', 'A'), c.investimento), BRL);
  label('A9:B9', 'Custo por Lead'); value('A10:B11', f('IFERROR(G4/D10,"")', c.custoLead), BRL);
  label('G9:H9', 'Leads'); value('D10:K11', f(per('N'), c.leads), '#,##0');
  label('A12:B13', 'Custo Agendamento'); value('A14:B15', f('IFERROR(G4/E14,"")', c.custoAgendamento), BRL);
  label('G12:H13', 'Agendamento'); value('E14:J15', f(per('O'), c.agendamentos), '#,##0');
  label('M12:N13', 'Taxa Agendamento'); value('M14:N15', f('IFERROR(E14/D10,"")', c.taxaAgendamento), PCT);
  label('A16:B17', 'Custo Comparecimento'); value('A18:B19', f('IFERROR(G4/F18,"")', c.custoComparecimento), BRL);
  label('F16:I17', 'Comparecimento'); value('F18:I19', f(per('R'), c.comparecimentos), '#,##0');
  label('M16:N17', 'Taxa Comparecimento'); value('M18:N19', f('IFERROR(F18/E14,"")', c.taxaComparecimento), PCT);
  label('A20:B21', 'Custo fechamento'); value('A22:B23', f('IFERROR(G4/G22,"")', c.custoFechamento), BRL);
  label('G20:H21', 'Fechamentos'); value('G22:H23', f(per('U'), c.fechamentos), '#,##0');
  label('M20:N21', 'Taxa Fechamentos'); value('M22:N23', f('IFERROR(G22/F18,"")', c.taxaFechamentos), PCT);
  label('A27:B27', 'Oportunidade'); value('A28:B29', f(per('S'), c.oportunidade), BRL);
  label('G27:H27', 'Faturamento'); value('G28:H29', f(per('T'), c.faturamento), BRL);
  label('J27:K27', 'Entrada'); value('J28:K29', f(per('V'), c.entrada), BRL);
  label('M27:N27', 'Ticket médio'); value('M28:N29', f('IFERROR(G28/G22,"")', c.ticketMedio), BRL);
  d.getCell('A30').value = 'TKM';
  value('B30:C30', f('IFERROR(A28/F18,"")', c.tkm), BRL);
  d.getCell('I30').value = 'tx de entrada';
  d.getCell('I31').value = f('IFERROR(J28/G28,"")', c.taxaEntrada);
  d.getCell('I31').numFmt = PCT;
  d.getCell('O23').value = 0.35;
  for (let i = 1; i <= 15; i++) d.getColumn(i).width = 12;

  // --- Projeto Ascension ---
  const p = wb.addWorksheet('Projeto Ascension');
  p.getColumn('B').width = 70;
  for (let i = 9; i <= 39; i++) p.getColumn(i).width = 4.5;
  const mesTxt = format(x.checklistMonth, 'MMMM yyyy', { locale: ptBR });
  let row = 7;
  PROJETOS.forEach(proj => {
    p.getCell(`B${row}`).value = proj.key === 'crc' ? 'projeto' : proj.titulo;
    p.getCell(`B${row}`).font = { bold: true, size: 13 };
    p.getCell(`D${row}`).value = mesTxt;
    p.getCell(`I${row + 1}`).value = 'DIA DO MÊS:';
    for (let dia = 1; dia <= 31; dia++) {
      const cell = p.getCell(row + 2, 8 + dia);
      cell.value = dia;
      cell.alignment = { horizontal: 'center' };
      cell.font = { bold: true, color: { argb: NAVY } };
    }
    proj.itens.forEach((item, i) => {
      const r = row + 3 + i;
      p.getCell(`B${r}`).value = item;
      p.getCell(`B${r}`).alignment = { wrapText: true, vertical: 'middle' };
      for (let dia = 1; dia <= 31; dia++) {
        const cell = p.getCell(r, 8 + dia);
        cell.value = x.checks.has(checkKey(proj.key, i, dia));
        cell.alignment = { horizontal: 'center' };
      }
      (p as unknown as { dataValidations: { add: (ref: string, v: ExcelJS.DataValidation) => void } }).dataValidations
        .add(`I${r}:AM${r}`, { type: 'list', allowBlank: false, formulae: ['"TRUE,FALSE"'] });
    });
    row = row + 3 + proj.itens.length + 1;
  });
  p.getCell('B1').value = 'TRUE = feito no dia. Marcações feitas no painel (ASCENSION → Projeto Ascension).';
  p.getCell('B1').font = { italic: true, color: { argb: 'FF666666' } };

  const mk = wb.addWorksheet('Midia Kit');
  mk.state = 'hidden';
  return wb;
}

// ---------------------------------------------------------------------------
// 2) Macedo odontologia - Planilha de Controle Geral (uma aba por mês)
// ---------------------------------------------------------------------------

const LEAD_HEADERS = ['DATA', 'NOME', 'NÚMERO', 'ESPECIALIDADE', 'ÚLTIMO CONTATO', 'DATA DO AGENDAMENTO', 'CLÍNICA',
  'ORIGEM\nDO CONTATO', 'OBJEÇÕES', 'CRC RESPONSÁVEL', 'AGENDOU', 'COMPARECEU', 'VALOR DO ORÇAMENTO (R$)', 'FECHOU?',
  'VALOR FECHADO (R$)', 'DATA DO FECHAMENTO'];
const ORIGIN_HEADERS = ['CATEGORIA', 'QTD. GERAL', 'AGENDAMENTOS', 'CV. AG.', 'COMPARECIMENTOS', 'CV. CP.', 'FECHAMENTOS',
  'CV. FCH.', 'TICKET MÉDIO', 'OPORT. DE VENDAS', 'VENDAS'];
const DAY_HEADERS = ['Data', 'Todos os \nLeads', 'Nº de Leads Agendados', 'Agendamentos p/ o dia ', 'Nº de Faltas',
  'Comparecimentos', 'Oportunidade de Vendas (R$)', 'Fechamentos do Dia (R$)', 'Nº de fechados no dia'];
const DAY_COLS_1 = ['AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK'];
const DAY_COLS_2 = ['AM', 'AN', 'AO', 'AP', 'AQ', 'AR', 'AS', 'AT', 'AU'];
const COL = (n: number) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };

export interface ControleMonth {
  month: Date;
  rows: ControleRow[];
  origens: OrigemRow[];
  total: OrigemRow;
  dias: DiaRow[];
}

/** Nome da aba como na planilha original: Nov26, Dez26… */
export const sheetName = (m: Date) => {
  const t = format(m, 'MMMyy', { locale: ptBR }).replace('.', '');
  return t.charAt(0).toUpperCase() + t.slice(1);
};

function controleSheet(wb: ExcelJS.Workbook, name: string, data: ControleMonth | null, categorias: string[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 20 }] });
  const widths: Record<string, number> = { A: 12.71, B: 33.14, C: 19.29, D: 18, E: 14, F: 14, G: 12, H: 18.57, I: 41, J: 16, K: 11, L: 13, M: 16, N: 10, O: 16, P: 14, Q: 34 };
  Object.entries(widths).forEach(([k, w]) => { ws.getColumn(k).width = w; });
  for (let i = 18; i <= 47; i++) if (!widths[COL(i)]) ws.getColumn(i).width = 13;

  // MÉTRICAS GERAIS
  ws.mergeCells('Q1:AA1');
  const t = ws.getCell('Q1');
  t.value = 'MÉTRICAS GERAIS';
  fill(t, 'FFCC0000');
  t.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  t.alignment = { horizontal: 'center' };
  ORIGIN_HEADERS.forEach((h, i) => {
    const cell = ws.getCell(2, 17 + i);
    cell.value = h;
    fill(cell, 'FFF4CCCC');
    cell.alignment = { horizontal: 'center', wrapText: true };
  });
  const firstCat = 3;
  const lastCat = firstCat + categorias.length - 1;
  categorias.forEach((cat, i) => {
    const r = firstCat + i;
    const o = data?.origens.find(x => x.categoria === cat);
    ws.getCell(`Q${r}`).value = cat;
    ws.getCell(`R${r}`).value = f(`COUNTIF(H:H,Q${r})`, o?.qtd ?? 0);
    ws.getCell(`S${r}`).value = f(`COUNTIFS($H:$H,$Q${r},$K:$K,"SIM")`, o?.agendamentos ?? 0);
    ws.getCell(`T${r}`).value = f(`IFERROR((S${r}/R${r}),"")`, o?.cvAg ?? null);
    ws.getCell(`U${r}`).value = f(`COUNTIFS($H:$H,$Q${r},$L:$L,"SIM")`, o?.comparecimentos ?? 0);
    ws.getCell(`V${r}`).value = f(`IFERROR((U${r}/S${r}),"")`, o?.cvCp ?? null);
    // A planilha original contava a coluna L (compareceu) aqui; fechamento é a coluna N (FECHOU?)
    ws.getCell(`W${r}`).value = f(`COUNTIFS($H:$H,$Q${r},$N:$N,"SIM")`, o?.fechamentos ?? 0);
    ws.getCell(`X${r}`).value = f(`IFERROR((AA${r}/Z${r}),"")`, o?.cvFch ?? null);
    ws.getCell(`Y${r}`).value = f(`IFERROR((AA${r}/W${r}),"")`, o?.ticket ?? null);
    ws.getCell(`Z${r}`).value = f(`SUMIFS($M:$M,$H:$H,$Q${r})`, o?.oportunidade ?? 0);
    ws.getCell(`AA${r}`).value = f(`SUMIFS($O:$O,$H:$H,$Q${r})`, o?.vendas ?? 0);
  });
  const tr = lastCat + 1;
  const tot = data?.total;
  ws.getCell(`Q${tr}`).value = 'TOTAL';
  ws.getCell(`Q${tr}`).font = { bold: true };
  ws.getCell(`R${tr}`).value = f(`SUM(R${firstCat}:R${lastCat})`, tot?.qtd ?? 0);
  ws.getCell(`S${tr}`).value = f(`SUM(S${firstCat}:S${lastCat})`, tot?.agendamentos ?? 0);
  ws.getCell(`T${tr}`).value = f(`IFERROR((S${tr}/R${tr}),"")`, tot?.cvAg ?? null);
  ws.getCell(`U${tr}`).value = f(`SUM(U${firstCat}:U${lastCat})`, tot?.comparecimentos ?? 0);
  ws.getCell(`V${tr}`).value = f(`IFERROR((U${tr}/S${tr}),"")`, tot?.cvCp ?? null);
  ws.getCell(`W${tr}`).value = f(`SUM(W${firstCat}:W${lastCat})`, tot?.fechamentos ?? 0);
  ws.getCell(`X${tr}`).value = f(`IFERROR((AA${tr}/Z${tr}),"")`, tot?.cvFch ?? null);
  ws.getCell(`Y${tr}`).value = f(`IFERROR(AA${tr}/W${tr},"")`, tot?.ticket ?? null);
  ws.getCell(`Z${tr}`).value = f(`SUM(Z${firstCat}:Z${lastCat})`, tot?.oportunidade ?? 0);
  ws.getCell(`AA${tr}`).value = f(`SUM(AA${firstCat}:AA${lastCat})`, tot?.vendas ?? 0);
  for (let r = firstCat; r <= tr; r++) {
    ['T', 'V', 'X'].forEach(k => { ws.getCell(`${k}${r}`).numFmt = '0%'; });
    ['Y', 'Z', 'AA'].forEach(k => { ws.getCell(`${k}${r}`).numFmt = BRL; });
    ws.getCell(`Q${r}`).font = { ...(ws.getCell(`Q${r}`).font ?? {}), color: { argb: 'FF434343' } };
  }

  // Métricas por dia (1 a 16 em AC:AK, 17 em diante em AM:AU)
  [DAY_COLS_1, DAY_COLS_2].forEach(cols => cols.forEach((k, i) => {
    const cell = ws.getCell(`${k}1`);
    cell.value = DAY_HEADERS[i];
    cell.font = { bold: true, color: { argb: NAVY } };
    cell.alignment = { wrapText: true, horizontal: 'center' };
  }));
  const daysInMonth = data?.dias ?? [];
  const writeDay = (cols: string[], r: number, dia: DiaRow | null, placeholder: boolean) => {
    const [cD, cL, cA, cAD, cF, cC, cO, cFV, cFN] = cols;
    const dateCell = ws.getCell(`${cD}${r}`);
    dateCell.value = dia ? xlDate(dia.data) : placeholder ? 'Informar Data' : null;
    dateCell.numFmt = DATE;
    const D = `${cD}${r}`;
    ws.getCell(`${cL}${r}`).value = f(`IF(${D}="", "--", COUNTIF(A:A, ${D}))`, dia ? dia.leads : '--');
    ws.getCell(`${cA}${r}`).value = f(`IF(${D}="", "--", COUNTIFS(A:A, ${D}, K:K, "SIM"))`, dia ? dia.leadsAgendados : '--');
    ws.getCell(`${cAD}${r}`).value = f(`IF(${D}="", "--", COUNTIF(F:F, ${D}))`, dia ? dia.agendamentosDia : '--');
    ws.getCell(`${cF}${r}`).value = f(`${cAD}${r}-${cC}${r}`, dia ? dia.faltas : 0);
    ws.getCell(`${cC}${r}`).value = f(`IF(${D}="", "--", COUNTIFS(F:F, ${D}, L:L, "SIM"))`, dia ? dia.comparecimentos : '--');
    ws.getCell(`${cO}${r}`).value = f(`IF(${D}="", "--", SUMIF(F:F, ${D}, M:M))`, dia ? dia.oportunidade : '--');
    ws.getCell(`${cFV}${r}`).value = f(`IF(${D}="", "--", SUMIF(P:P, ${D}, O:O))`, dia ? dia.fechamentosValor : '--');
    ws.getCell(`${cFN}${r}`).value = f(`IF(${D}="", "--", COUNTIF(P:P, ${D}))`, dia ? dia.fechados : '--');
    [cO, cFV].forEach(k => { ws.getCell(`${k}${r}`).numFmt = BRL; });
    cols.forEach(k => { fill(ws.getCell(`${k}${r}`), 'FFF3F3F3'); ws.getCell(`${k}${r}`).font = { color: { argb: 'FF434343' } }; });
  };
  for (let i = 0; i < 16; i++) writeDay(DAY_COLS_1, i + 2, daysInMonth[i] ?? null, !data);
  for (let i = 16; i < (data ? daysInMonth.length : 31); i++) writeDay(DAY_COLS_2, i - 14, daysInMonth[i] ?? null, !data);

  // Cabeçalho e linhas de leads (A20:P…)
  LEAD_HEADERS.forEach((h, i) => {
    const cell = ws.getCell(20, i + 1);
    cell.value = h;
    fill(cell, 'FFCC0000');
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
  });
  ws.getRow(20).height = 32;
  (data?.rows ?? []).forEach((r, i) => {
    const n = 21 + i;
    const vals: ExcelJS.CellValue[] = [
      xlDate(r.data), r.nome, r.numero, r.especialidade, r.ultimoContato ? xlDate(r.ultimoContato) : null,
      r.dataAgendamento ? xlDate(r.dataAgendamento) : null, r.clinica || null, r.origem, r.objecoes || null, r.crc || null,
      r.agendou || null, r.compareceu || null, r.orcamento, r.fechou || null, r.valorFechado,
      r.dataFechamento ? xlDate(r.dataFechamento) : null,
    ];
    vals.forEach((v, j) => { ws.getCell(n, j + 1).value = v; });
  });
  ['A', 'E', 'F', 'P'].forEach(k => { ws.getColumn(k).numFmt = DATE; });
  ['M', 'O'].forEach(k => { ws.getColumn(k).numFmt = BRL; });
  ws.getColumn('C').numFmt = '@';

  // Listas (validações) como na original — um intervalo por lista, sem sobreposição
  const dv = (ws as unknown as { dataValidations: { add: (ref: string, v: ExcelJS.DataValidation) => void } }).dataValidations;
  const list = (formula: string): ExcelJS.DataValidation => ({ type: 'list', allowBlank: true, formulae: [formula] });
  dv.add('K21:L1257', list('"SIM,NÃO,ESP"'));
  dv.add('N21:N1257', list('"SIM,NÃO,ESP"'));
  dv.add('G21:G1257', list(`"${CLINICA_OPTIONS.join(',')}"`));
  dv.add(`H21:H1257`, list(`$Q$${firstCat}:$Q$${lastCat}`));
}

export async function buildControleWorkbook(months: ControleMonth[], categorias: string[]) {
  const wb = await newBook();
  months.forEach(m => controleSheet(wb, sheetName(m.month), m, categorias));
  controleSheet(wb, 'Base p Duplicar', null, categorias);
  return wb;
}
