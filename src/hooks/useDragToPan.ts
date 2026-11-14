import { useEffect } from 'react';

const INTERACTIVE = 'button, a, input, textarea, select, label, [role="button"], [draggable="true"], [data-no-pan]';

/**
 * Clicar e arrastar num espaço vazio do quadro move as colunas para os lados,
 * como "puxar" a tela. Cards, botões e campos continuam funcionando normalmente.
 */
export function useDragToPan(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    // Escuta na janela: o quadro pode aparecer depois (quando os dados carregam)
    let el: HTMLElement | null = null;
    let startX = 0;
    let startLeft = 0;
    let active = false;
    let moved = false;
    let frame = 0;
    let next = 0;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.pointerType !== 'mouse') return;
      el = ref.current;
      if (!el || !el.contains(e.target as Node)) return;
      if ((e.target as Element).closest(INTERACTIVE)) return;
      active = true;
      moved = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    };
    const onMove = (e: PointerEvent) => {
      if (!active || !el) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) < 4) return;
      if (!moved) {
        moved = true;
        el.setPointerCapture(e.pointerId);
        el.style.cursor = 'grabbing';
        el.style.userSelect = 'none';
      }
      next = startLeft - dx;
      const target = el;
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; target.scrollLeft = next; });
    };
    const onUp = (e: PointerEvent) => {
      if (!active || !el) return;
      active = false;
      if (moved && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      el.style.cursor = '';
      el.style.userSelect = '';
    };

    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [ref]);
}
