import { formatPaceValue, paceUnitLabel, type PaceUnit } from "@/lib/format";

interface PaceDisplayProps {
  secPerKm: number;
  unit: PaceUnit;
  className?: string;
}

export function PaceDisplay({ secPerKm, unit, className = "" }: PaceDisplayProps) {
  return (
    <span className={`tabular-nums ${className}`}>
      {formatPaceValue(secPerKm, unit)}
      <span className="ml-1 text-[0.5em] font-normal text-muted">{paceUnitLabel(unit)}</span>
    </span>
  );
}

interface PaceRangeProps {
  fastSecPerKm: number;
  slowSecPerKm: number;
  unit: PaceUnit;
  className?: string;
}

export function PaceRange({ fastSecPerKm, slowSecPerKm, unit, className = "" }: PaceRangeProps) {
  return (
    <span className={`tabular-nums ${className}`}>
      {formatPaceValue(fastSecPerKm, unit)} sampai {formatPaceValue(slowSecPerKm, unit)}
      <span className="ml-1 text-muted">{paceUnitLabel(unit)}</span>
    </span>
  );
}
