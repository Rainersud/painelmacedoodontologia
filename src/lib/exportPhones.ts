// Exportar telefones de todos os contatos (leads) numa planilha Excel, sem números repetidos.

export interface PhoneSource {
  name: string | null;
  phone: string | null;
  whatsapp?: string | null;
  status?: string | null;
  lead_arrival_source?: string | null;
  created_at: string;
}

export interface PhoneRow {
  nome: string;
  telefone: string;      // (11) 98765-4321
  whatsapp: string;      // 5511987654321
  status: string;
  origem: string;
  cadastro: Date;
}

/** Só os dígitos, sem o 55 do Brasil: "+55 (11) 98765-4321" e "11987654321" viram a mesma chave. */
export function phoneKey(raw: string | null | undefined): string | null {
  let d = (raw ?? '').replace(/\D/g, '');
  if ((d.length === 12 || d.length === 13) && d.startsWith('55')) d = d.slice(2);
  if ((d.length === 11 || d.length === 12) && d.startsWith('0')) d = d.slice(1);
  if (d.length < 8) return null;
  return d;
}

export function formatPhone(key: string): string {
  if (key.length === 11) return `(${key.slice(0, 2)}) ${key.slice(2, 7)}-${key.slice(7)}`;
  if (key.length === 10) return `(${key.slice(0, 2)}) ${key.slice(2, 6)}-${key.slice(6)}`;
  return key;
}

/**
 * Uma linha por número. Cada contato entra com o telefone e, se for outro número, o WhatsApp.
 * Número repetido nunca entra duas vezes: fica o do contato cadastrado primeiro.
 */
export function uniquePhones(
  leads: PhoneSource[],
  labels: { status?: (s: string) => string; origem?: (s: string) => string } = {},
): { rows: PhoneRow[]; duplicados: number } {
  const ordered = [...leads].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const seen = new Set<string>();
  const rows: PhoneRow[] = [];
  let duplicados = 0;
  for (const l of ordered) {
    const keys = [phoneKey(l.phone), phoneKey(l.whatsapp)].filter((k, i, arr): k is string => !!k && arr.indexOf(k) === i);
    for (const k of keys) {
      if (seen.has(k)) { duplicados++; continue; }
      seen.add(k);
      rows.push({
        nome: (l.name ?? '').trim(),
        telefone: formatPhone(k),
        whatsapp: `55${k}`,
        status: l.status ? labels.status?.(l.status) ?? l.status : '',
        origem: l.lead_arrival_source ? labels.origem?.(l.lead_arrival_source) ?? l.lead_arrival_source : '',
        cadastro: new Date(l.created_at),
      });
    }
  }
  return { rows, duplicados };
}

/** Monta e baixa a planilha .xlsx. */
export async function downloadPhonesXlsx(rows: PhoneRow[], fileName: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Telefones');
  ws.columns = [
    { header: 'Nome', key: 'nome', width: 34 },
    { header: 'Telefone', key: 'telefone', width: 18 },
    { header: 'WhatsApp (com 55)', key: 'whatsapp', width: 18 },
    { header: 'Status', key: 'status', width: 24 },
    { header: 'Origem', key: 'origem', width: 22 },
    { header: 'Cadastrado em', key: 'cadastro', width: 16, style: { numFmt: 'dd/mm/yyyy' } },
  ];
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.autoFilter = { from: 'A1', to: 'F1' };
  // telefones como texto, para o Excel não comer zeros nem virar notação científica
  ws.getColumn('telefone').numFmt = '@';
  ws.getColumn('whatsapp').numFmt = '@';
  rows.forEach(r => ws.addRow(r));
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
