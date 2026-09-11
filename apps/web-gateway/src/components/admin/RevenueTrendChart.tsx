import { formatPrice } from "@/lib/utils";

interface RevenueTrendChartProps {
  series: { period: string; amount: number }[];
  currency: string;
  from: string;
  to: string;
}

/**
 * Plain SVG/CSS bar chart (§4.6 of the defect audit) — no charting
 * dependency added for one series. The <svg> carries an aria-label with
 * the same summary a sighted user gets from the bars, and a visually
 * hidden table repeats every data point, so the chart doesn't depend on
 * color or vision to be understood.
 */
export function RevenueTrendChart({ series, currency, from, to }: RevenueTrendChartProps) {
  const fromLabel = new Date(from).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const toLabel = new Date(to).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  if (series.length === 0 || series.every((point) => point.amount === 0)) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong bg-surface px-4 py-8 text-center text-body-sm text-muted-foreground">
        No revenue recorded between {fromLabel} and {toLabel}.
      </div>
    );
  }

  const total = series.reduce((sum, point) => sum + point.amount, 0);
  const max = Math.max(...series.map((point) => point.amount), 1);
  const width = 600;
  const height = 160;
  const gap = 4;
  const barWidth = (width - gap * (series.length - 1)) / series.length;
  const summary = `Revenue trend from ${fromLabel} to ${toLabel}: total ${formatPrice(total, currency)} across ${series.length} day${series.length === 1 ? "" : "s"}.`;

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary} className="h-40 w-full">
        {series.map((point, i) => {
          const barHeight = (point.amount / max) * (height - 8);
          const x = i * (barWidth + gap);
          const y = height - barHeight;
          return (
            <rect key={point.period} x={x} y={y} width={barWidth} height={Math.max(barHeight, point.amount > 0 ? 2 : 0)} className="fill-foreground/80" rx={2}>
              <title>{`${new Date(point.period).toLocaleDateString("en-US", { month: "short", day: "numeric" })}: ${formatPrice(point.amount, currency)}`}</title>
            </rect>
          );
        })}
      </svg>
      <p className="text-caption text-muted-foreground">{summary}</p>
      <table className="sr-only">
        <caption>Daily revenue, {fromLabel} to {toLabel}</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {series.map((point) => (
            <tr key={point.period}>
              <td>{new Date(point.period).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</td>
              <td>{formatPrice(point.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
