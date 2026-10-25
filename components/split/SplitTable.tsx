"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { LIMITS } from "@/lib/calculations/constants";
import type { SplitRow } from "@/lib/calculations/splits";
import {
  formatClock,
  formatKm,
  formatPaceValue,
  formatSignedSeconds,
  paceToUnit,
  paceUnitLabel,
  type PaceUnit,
} from "@/lib/format";
import { parseDuration } from "@/lib/validation";

interface SplitTableProps {
  rows: SplitRow[];
  unit: PaceUnit;
  segmentKm: number;
  editable: boolean;
  onEdit?: (index: number, seconds: number | null) => void;
}

function rowLabel(row: SplitRow, segmentKm: number): string {
  const label = segmentKm === 1 ? formatKm(row.endKm) : `${formatKm(row.startKm)} sampai ${formatKm(row.endKm)}`;
  return label;
}

interface SplitTimeInputProps {
  row: SplitRow;
  label: string;
  onEdit: (index: number, seconds: number | null) => void;
}

function SplitTimeInput({ row, label, onEdit }: SplitTimeInputProps) {
  const [draft, setDraft] = useState(formatClock(row.seconds));
  const [error, setError] = useState<string | null>(null);

  function commit(): void {
    const parsed = parseDuration(draft, { label: "Waktu split", min: 1, max: 7200 });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const pace = parsed.value / row.lengthKm;
    if (pace < LIMITS.paceSeconds.min || pace > LIMITS.paceSeconds.max) {
      setError("Pace split tidak masuk akal (2:00 sampai 15:00 /km).");
      return;
    }
    setError(null);
    if (parsed.value !== row.seconds) onEdit(row.index, parsed.value);
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {row.edited && (
        <button
          type="button"
          onClick={() => onEdit(row.index, null)}
          aria-label={`Kembalikan split km ${label} ke otomatis`}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-elevated hover:text-ink"
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
      )}
      <div className="w-[84px]">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commit();
          }}
          inputMode="text"
          autoComplete="off"
          aria-label={`Waktu split km ${label}`}
          aria-invalid={error ? true : undefined}
          title={error ?? undefined}
          className={`h-9 w-full rounded-md border bg-bg px-2 text-right text-sm tabular-nums text-ink ${
            error ? "border-bad" : row.edited ? "border-accent/60" : "border-line"
          } focus:border-accent`}
        />
        {error && (
          <p role="alert" className="mt-1 w-40 -translate-x-[76px] text-left text-[11px] leading-snug text-bad">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export function SplitTable({ rows, unit, segmentKm, editable, onEdit }: SplitTableProps) {
  return (
    <div className="max-h-[560px] overflow-auto rounded-lg border border-line">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-elevated text-left text-xs text-muted">
          <tr>
            <th scope="col" className="px-3 py-2.5 font-medium">
              Km
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              Pace
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              Waktu split
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              Akumulasi
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              Selisih pace
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const label = rowLabel(row, segmentKm);
            const partial = Math.abs(row.lengthKm - segmentKm) > 1e-6;
            const delta =
              row.paceDeltaSeconds === null
                ? null
                : Math.round(paceToUnit(row.paceDeltaSeconds, unit));
            return (
              <tr key={row.index} className="border-t border-line">
                <th scope="row" className="px-3 py-2 text-left font-normal tabular-nums text-ink">
                  {label}
                  {partial && (
                    <span className="ml-2 text-xs text-muted">sisa {Number(row.lengthKm.toFixed(3))} km</span>
                  )}
                </th>
                <td className="px-3 py-2 text-right tabular-nums text-ink">
                  {formatPaceValue(row.paceSecPerKm, unit)}
                  <span className="ml-1 text-xs text-muted">{paceUnitLabel(unit)}</span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-ink">
                  {editable && onEdit ? (
                    <SplitTimeInput
                      key={`${row.index}-${row.seconds}-${row.edited}`}
                      row={row}
                      label={label}
                      onEdit={onEdit}
                    />
                  ) : (
                    formatClock(row.seconds)
                  )}
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-muted">{formatClock(row.cumulativeSeconds)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted">
                  {delta === null ? "-" : `${formatSignedSeconds(delta)} dtk`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
