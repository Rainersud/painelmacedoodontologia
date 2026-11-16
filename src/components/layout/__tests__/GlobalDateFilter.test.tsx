import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PeriodFilterProvider, usePeriodFilter } from '@/components/dashboard/PeriodFilterContext';
import { GlobalDateFilter } from '../GlobalDateFilter';

function Estado() {
  const { period, range } = usePeriodFilter();
  return <p data-testid="estado">{period} {range.start.toISOString().slice(0, 10)}</p>;
}

function setup() {
  localStorage.clear();
  render(<PeriodFilterProvider><GlobalDateFilter /><Estado /></PeriodFilterProvider>);
  fireEvent.click(screen.getByRole('button', { name: /Filtro de data do sistema/ }));
}

describe('filtro de data: escolha obrigatória', () => {
  it('trocar para Semana não muda nada até escolher a semana', () => {
    setup();
    const antes = screen.getByTestId('estado').textContent;
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }));
    expect(screen.getByRole('status').textContent).toMatch(/Escolha a semana/);
    expect(screen.getByRole('button', { name: 'Escolha primeiro' })).toBeDisabled();
    expect(screen.getByTestId('estado').textContent).toBe(antes);
  });

  it('Mês só aplica depois de clicar no mês', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Dia' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mês' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mar' }));
    const y = new Date().getFullYear();
    expect(screen.getByTestId('estado').textContent).toBe(`mes ${y}-03-01`);
    expect(screen.getByRole('button', { name: 'Pronto' })).toBeEnabled();
  });

  it('Ano aplica ao escolher o ano', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Ano' }));
    const y = String(new Date().getFullYear() - 1);
    fireEvent.click(screen.getByRole('button', { name: y }));
    expect(screen.getByTestId('estado').textContent).toBe(`ano ${y}-01-01`);
  });
});
