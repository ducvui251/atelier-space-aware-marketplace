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
 *
 * This is a magnitude series (one measure over time), so per the dataviz
 * skill's form heuristic it gets ONE hue ramped by value (sequential), not
 * a rainbow — bars fade from a light tint at low values to full --primary
 * at the peak. The peak and most-recent bar get a direct value label
 * (selective, not one on every bar) so the headline numbers don't require
 * hovering to read.
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
  const peakIndex = series.reduce((best, point, i) => (point.amount > series[best].amount ? i : best), 0);
  const latestIndex = series.length - 1;
  const width = 600;
  const height = 180;
  const labelSpace = 22; // headroom above bars for direct value labels
  const chartHeight = height - labelSpace;
  const gap = 4;
  const barWidth = (width - gap * (series.length - 1)) / series.length;
  const summary = `Revenue trend from ${fromLabel} to ${toLabel}: total ${formatPrice(total, currency)} across ${series.length} day${series.length === 1 ? "" : "s"}.`;

  function dayLabel(period: string) {
    return new Date(period).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary} className="h-44 w-full overflow-visible">
        {/* Baseline — recessive, grounds the bars instead of letting them float. */}
        <line x1={0} y1={height} x2={width} y2={height} className="stroke-border" strokeWidth={1} />
        {series.map((point, i) => {
          const ratio = point.amount / max;
          // Sequential ramp within one hue: light tint at low values, full
          // strength at the peak, never fully transparent so a $0 day still
          // registers as a mark rather than disappearing.
          const opacity = point.amount > 0 ? 0.28 + 0.72 * ratio : 0.12;
          const barHeight = ratio * (chartHeight - 8);
          const x = i * (barWidth + gap);
          const y = height - barHeight;
          const isCallout = i === peakIndex || i === latestIndex;
          return (
            <g key={point.period}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, point.amount > 0 ? 2 : 0)}
                rx={2}
                style={{ fill: "var(--primary)", fillOpacity: opacity }}
              >
                <title>{`${dayLabel(point.period)}: ${formatPrice(point.amount, currency)}`}</title>
              </rect>
              {isCallout && point.amount > 0 ? (
                <text
                  x={x + barWidth / 2}
                  y={Math.max(y - 6, 10)}
                  textAnchor="middle"
                  className="fill-foreground text-[10px] font-medium"
                >
                  {formatPrice(point.amount, currency)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-between text-caption text-muted-foreground">
        <span>{summary}</span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="inline-block size-2 rounded-full" style={{ background: "var(--primary)" }} />
          Peak {dayLabel(series[peakIndex].period)}
        </span>
      </div>
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
              <td>{dayLabel(point.period)}</td>
              <td>{formatPrice(point.amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
