interface Props {
  value: number | null | undefined;
  marketAvg: number | null | undefined;
  format?: (v: number) => string;
  invertColors?: boolean; // true for mileage (lower is better), false for price (lower is better for buyer)
}

export default function ComparisonIndicator({ value, marketAvg, format, invertColors = false }: Props) {
  if (value == null || marketAvg == null || marketAvg === 0) {
    return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  }

  const formatted = format ? format(value) : value.toLocaleString('pl-PL');
  const diff = (value - marketAvg) / marketAvg;
  const threshold = 0.05; // 5%

  let icon: string;
  let className: string;

  if (diff > threshold) {
    // Above market
    icon = '▲';
    className = invertColors ? 'indicator-up' : 'indicator-up'; // higher price = red, higher mileage = red
  } else if (diff < -threshold) {
    // Below market
    icon = '▼';
    className = invertColors ? 'indicator-down' : 'indicator-down'; // lower price = green, lower mileage = green
  } else {
    // Neutral
    icon = '●';
    className = 'indicator-neutral';
  }

  return (
    <span className={className} style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
      <span style={{ marginRight: 4, fontSize: 10 }}>{icon}</span>
      {formatted}
    </span>
  );
}
