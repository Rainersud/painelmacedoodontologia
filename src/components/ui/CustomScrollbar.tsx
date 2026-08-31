import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from "@/lib/utils";

interface CustomScrollbarProps {
  children: React.ReactNode;
  className?: string;
  trackClassName?: string;
  thumbClassName?: string;
}

export function CustomScrollbar({ 
  children, 
  className,
  trackClassName,
  thumbClassName
}: CustomScrollbarProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const [visible, setVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);

  const updateThumb = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const { clientHeight, scrollHeight, scrollTop } = el;
    const hasOverflow = scrollHeight > clientHeight;
    setVisible(hasOverflow);
    if (!hasOverflow) {
      setThumbHeight(0);
      setThumbTop(0);
      return;
    }
    const ratio = clientHeight / scrollHeight;
    const height = Math.max(ratio * clientHeight, 40);
    const maxScroll = scrollHeight - clientHeight;
    const maxThumb = clientHeight - height;
    const top = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumb : 0;
    setThumbHeight(height);
    setThumbTop(top);
  }, []);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    updateThumb();
    el.addEventListener('scroll', updateThumb, { passive: true });
    const ro = new ResizeObserver(updateThumb);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateThumb);
      ro.disconnect();
    };
  }, [updateThumb]);

  const handleThumbMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    const el = contentRef.current;
    dragStartScrollTop.current = el?.scrollTop || 0;
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const el = contentRef.current;
      if (!el) return;
      const deltaY = e.clientY - dragStartY.current;
      const { clientHeight, scrollHeight } = el;
      const maxScroll = scrollHeight - clientHeight;
      const maxThumb = clientHeight - thumbHeight;
      if (maxThumb <= 0) return;
      const newScroll = dragStartScrollTop.current + (deltaY / maxThumb) * maxScroll;
      el.scrollTop = Math.max(0, Math.min(maxScroll, newScroll));
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, thumbHeight]);

  return (
    <div className={cn("relative h-full", className)}>
      <div
        ref={contentRef}
        className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide"
      >
        {children}
      </div>
      {visible && (
        <div className={cn("absolute right-0 top-0 bottom-0 w-5 rounded-full bg-muted/80 z-10", trackClassName)}>
          <div
            className={cn(
              "absolute right-1 w-3 rounded-full bg-primary shadow-sm hover:bg-primary/90 cursor-grab active:cursor-grabbing transition-colors",
              thumbClassName
            )}
            style={{ height: thumbHeight, top: thumbTop }}
            onMouseDown={handleThumbMouseDown}
          />
        </div>
      )}
    </div>
  );
}
