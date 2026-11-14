// Análise de Perdas: agrupa os motivos escritos à mão em categorias, para dar para comparar.

export type LossCategory = 'preco' | 'sumiu' | 'desistiu' | 'concorrente' | 'atendimento' | 'tempo' | 'outro';

export const LOSS_CATEGORIES: { key: LossCategory; label: string; hint: string }[] = [
  { key: 'preco', label: 'Preço / financeiro', hint: 'Preço, orçamento, cartão, crédito, parcelas' },
  { key: 'sumiu', label: 'Sumiu / sem resposta', hint: 'Parou de responder, não atende' },
  { key: 'desistiu', label: 'Desistiu', hint: 'Desistiu, não quer mais' },
  { key: 'concorrente', label: 'Fechou com outro', hint: 'Outro dentista, outra clínica' },
  { key: 'atendimento', label: 'Atendimento', hint: 'Experiência, dentista, demora' },
  { key: 'tempo', label: 'Agora não / depois', hint: 'Vai esperar, mais para frente, sem tempo' },
  { key: 'outro', label: 'Outros', hint: 'Motivos que não se encaixam acima' },
];

const RULES: [LossCategory, RegExp][] = [
  ['concorrente', /\b(outr[oa]s? (dentista|clinica|consultorio|lugar)|dentista d[oa]|concorr|fechou com|vai fazer com|fez com|ja fez)/],
  ['tempo', /(esperar|depois|mais pra frente|mais para frente|ano que vem|proximo (mes|ano)|sem tempo|agora nao|futuro|viagem|viajar|ferias)/],
  ['preco', /(preco|caro|valor|orcamento|dinheiro|cartao|credito|parcel|financ|nao (da|cabe)|condic|pagar|pagamento|boleto|limite|desconto|grana)/],
  ['sumiu', /(sumiu|nao respond|parou de respond|nao atende|sem resposta|visualiz|ignor|vacuo|bloque|numero (errado|invalido)|nao retorn)/],
  ['atendimento', /(atendimento|chato|demor|grosse|mal atendid|experiencia|nao gostou|dentista)/],
  ['desistiu', /(desist|nao quer|perdeu interesse|sem interesse|mudou de ideia)/],
];

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function lossCategory(reason: string | null | undefined): LossCategory {
  const t = norm(reason ?? '').trim();
  if (!t) return 'outro';
  for (const [cat, re] of RULES) if (re.test(t)) return cat;
  return 'outro';
}

export function categoryLabel(cat: LossCategory) {
  return LOSS_CATEGORIES.find(c => c.key === cat)!.label;
}
