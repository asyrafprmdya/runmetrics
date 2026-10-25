import type { HeartRateZone } from "@/lib/calculations/heartRate";

interface HeartRateZoneChartProps {
  zones: HeartRateZone[];
  highlightBpm?: number | null;
}

export function HeartRateZoneChart({ zones, highlightBpm = null }: HeartRateZoneChartProps) {
  if (zones.length === 0) return null;
  const min = zones[0].lowBpm;
  const max = zones[zones.length - 1].highBpm;
  const span = Math.max(max - min, 1);
  const position = (bpm: number): number => ((bpm - min) / span) * 100;

  return (
    <ul className="grid gap-3" aria-label="Zona heart rate">
      {zones.map((zone) => {
        const active =
          highlightBpm !== null && highlightBpm >= zone.lowBpm && highlightBpm <= zone.highBpm;
        const left = position(zone.lowBpm);
        const width = Math.max(position(zone.highBpm) - left, 2);
        return (
          <li key={zone.zone} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 sm:grid-cols-[148px_1fr_104px]">
            <p className="text-[13px] text-ink">
              <span className="tabular-nums text-muted">Z{zone.zone}</span> {zone.name}
              {active && <span className="ml-2 rounded border border-accent/60 px-1.5 py-px text-[11px] text-accent">Target</span>}
            </p>
            <p className="text-right text-[13px] tabular-nums text-ink sm:order-3">
              {zone.lowBpm} sampai {zone.highBpm}
              <span className="ml-1 text-xs text-muted">bpm</span>
            </p>
            <div
              className="relative col-span-2 h-2.5 rounded-full bg-bg sm:order-2 sm:col-span-1"
              aria-hidden="true"
            >
              <div
                className={`absolute inset-y-0 rounded-full ${active ? "bg-accent" : "bg-muted/45"}`}
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
