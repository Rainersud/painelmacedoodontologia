import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AscensionSuporte from '../AscensionSuporte';

describe('Suporte: réguas abrem a copy', () => {
  it('clicar em Dia 1 da régua abre o script com botão copiar', () => {
    localStorage.clear();
    render(<MemoryRouter><AscensionSuporte /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^Dia 1/ }));
    const dlg = screen.getByRole('dialog');
    expect(within(dlg).getByText('Dia 1 — mensagem depois da 3ª ligação')).toBeTruthy();
    expect(within(dlg).getAllByRole('button', { name: /Copiar/ }).length).toBeGreaterThan(0);
  });
  it('nome do paciente digitado no diálogo entra no texto', () => {
    localStorage.clear();
    render(<MemoryRouter><AscensionSuporte /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /^–1h/ }));
    const dlg = screen.getByRole('dialog');
    fireEvent.change(within(dlg).getByLabelText('Paciente'), { target: { value: 'Maria' } });
    expect(within(dlg).getAllByText(/Oi, Maria!/).length).toBeGreaterThan(0);
  });
});
