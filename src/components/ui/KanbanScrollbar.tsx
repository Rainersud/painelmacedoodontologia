import { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface KanbanScrollbarProps {
  targetRef: React.RefObject<HTMLElement>;
  className?: string;
}

/**
 * Custom horizontal scrollbar synced to a scrollable target element.
 * Always visible, thick, and easy to drag — works around native overlay
 * scrollbar issues in headless/Linux Chromium and gives a consistent feel.
 */
export function KanbanScrollbar({ targetRef, className }: KanbanScrollbarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const [thumbWidth, setThumbWidth] = useState(0);
  const [thumbLeft, setThumbLeft] = useState(0);
  const dragging = useRef(false);

  const updateThumb = useCallback(() => {
    const target = targetRef.current;
    if (!target) return;
    const visible = target.clientWidth;
    const total = target.scrollWidth;
    const maxScroll = Math.max(0, total - visible);
    const ratio = visible / Math.max(1, total);
    const width = Math.max(48, visible * ratio);
    const maxThumbLeft = Math.max(0, visible - width);
    const left = maxScroll > 0 ? (target.scrollLeft / maxScroll) * maxThumbLeft : 0;
    setThumbWidth(width);
    setThumbLeft(left);
  }, [targetRef]);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;
    updateThumb();
    const onScroll = () => updateThumb();
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', updateThumb);

    const ro = new ResizeObserver(updateThumb);
    ro.observe(target);
    Array.from(target.children).forEach((c) => ro.observe(c as Element));

    return () => {
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', updateThumb);
      ro.disconnect();
    };
  }, [targetRef, updateThumb]);

  const handleTrackClick = (e: React.MouseEvent) => {
    if (e.target === thumbRef.current || thumbRef.current?.contains(e.target as Node)) return;
    const target = targetRef.current;
    const track = trackRef.current;
    if (!target || !track) return;
    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const maxScroll = Math.max(0, target.scrollWidth - target.clientWidth);
    const ratio = clickX / track.clientWidth;
    target.scrollLeft = ratio * maxScroll;
  };

  const handleThumbMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    const target = targetRef.current;
    if (!target) return;
    const startX = e.clientX;
    const startScroll = target.scrollLeft;
    const maxScroll = Math.max(0, target.scrollWidth - target.clientWidth);
    const trackWidth = trackRef.current?.clientWidth || target.clientWidth;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const deltaX = ev.clientX - startX;
      const scrollDelta = (deltaX / trackWidth) * maxScroll;
      target.scrollLeft = Math.max(0, Math.min(maxScroll, startScroll + scrollDelta));
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      ref={trackRef}
      className={cn(
        "shrink-0 w-full h-7 rounded-full bg-muted/80 border border-border/60 cursor-pointer relative select-none",
        className
      )}
      onClick={handleTrackClick}
      aria-hidden="true"
    >
      <div
        ref={thumbRef}
        className="absolute top-1 h-5 rounded-full bg-primary/70 hover:bg-primary/95 active:bg-primary transition-colors shadow-sm"
        style={{ width: thumbWidth, left: thumbLeft }}
        onMouseDown={handleThumbMouseDown}
      />
    </div>
  );
}
