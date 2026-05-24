import { cn } from '@/lib/utils';

interface SparklineProps {
  data: number[];
  className?: string;
  strokeClassName?: string;
  fillClassName?: string;
  height?: number;
}

/**
 * Tiny inline SVG sparkline (no external deps).
 * Renders a smooth line + soft area fill scaled to the data range.
 */
export function Sparkline({
  data,
  className,
  strokeClassName = 'stroke-current',
  fillClassName = 'fill-current',
  height = 28,
}: SparklineProps) {
  const width = 100;
  if (!data || data.length === 0) {
    return <div className={cn('w-full', className)} style={{ height }} />;
  }
  const points = data.length === 1 ? [data[0], data[0]] : data;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const stepX = width / Math.max(1, points.length - 1);

  const coords = points.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return [x, y] as const;
  });

  const linePath = coords.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(' ');
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full overflow-visible', className)}
      style={{ height }}
      aria-hidden="true"
    >
      <path d={areaPath} className={cn('opacity-15', fillClassName)} stroke="none" />
      <path d={linePath} className={strokeClassName} fill="none" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
