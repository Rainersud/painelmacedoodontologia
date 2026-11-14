import { describe, it, expect } from 'vitest';
import { lossCategory } from './lossAnalysis';

describe('Análise de Perdas — categorias de motivo', () => {
  it.each([
    ['Preço', 'preco'],
    ['Não tem cartão', 'preco'],
    ['Infelizmente no nosso orçamento não dá por enquanto', 'preco'],
    ['Sumiu', 'sumiu'],
    ['Desistiu', 'desistiu'],
    ['Vai fazer com o dentista do sócio do filho', 'concorrente'],
    ['Vai esperar virar cartão', 'tempo'],
    ['dentista chato', 'atendimento'],
    ['', 'outro'],
    ['qualquer coisa', 'outro'],
  ])('"%s" → %s', (reason, cat) => {
    expect(lossCategory(reason)).toBe(cat);
  });
});
