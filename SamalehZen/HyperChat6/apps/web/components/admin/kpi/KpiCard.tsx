type KpiCardProps = {
  title: string;
  value: number | string;
  series?: number[];
  dates?: string[];
  color?: 'emerald' | 'amber' | 'red' | 'sky';
};

export function KpiCard({ title, value, series = [], dates = [], color = 'emerald' }: KpiCardProps) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="text-2xl font-semibold">{value}</div>
        <MiniSpark series={series} color={color} />
      </div>
      {dates.length > 1 && (
        <div className="mt-1 text-xs text-muted-foreground">
          {dates[0]} → {dates[dates.length - 1]}
        </div>
      )}
    </div>
  );
}

function MiniSpark({ series, color }: { series: number[]; color: 'emerald' | 'amber' | 'red' | 'sky' }) {
  const max = Math.max(1, ...series);
  const heights = series.map(v => Math.max(2, Math.round((v / max) * 24)));
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-500/70',
    amber: 'bg-amber-500/70',
    red: 'bg-red-500/70',
    sky: 'bg-sky-500/70',
  };
  return (
    <div className="flex h-16 w-28 items-end gap-1">
      {heights.map((h, i) => (
        <div key={i} className={`${colors[color]} w-2 rounded`} style={{ height: `${h}px` }} />
      ))}
    </div>
  );
}
