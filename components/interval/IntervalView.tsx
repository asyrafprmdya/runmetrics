"use client";

import { Timer } from "lucide-react";
import { LoadingPanel } from "@/components/ui/EmptyState";
import { LiveField } from "@/components/ui/LiveField";
import { MetricCard } from "@/components/ui/MetricCard";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaceDisplay } from "@/components/ui/PaceDisplay";
import { Panel } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/fields";
import { LIMITS, TRAINING_TYPES } from "@/lib/calculations/constants";
import { getHeartRateInfo, getReferenceMetrics } from "@/lib/calculations/derive";
import { CalculationError, tryCalc } from "@/lib/calculations/errors";
import { calculateTargetHR } from "@/lib/calculations/heartRate";
import {
  calculateWorkoutDuration,
  type WorkoutPlan,
  type WorkoutSegmentType,
} from "@/lib/calculations/workout";
import {
  formatClock,
  formatDurationWords,
  formatMeters,
  formatPaceValue,
  paceUnitLabel,
} from "@/lib/format";
import { useAppState } from "@/lib/storage/useAppState";
import type { IntervalSettings } from "@/lib/types";
import { parseDuration, parseNumber, validatePaceInput } from "@/lib/validation";

const SEGMENT_LABELS: Record<WorkoutSegmentType, string> = {
  warmup: "Warm-up",
  work: "Lari",
  recovery: "Recovery",
  cooldown: "Cool-down",
};

const SEGMENT_BAR: Record<WorkoutSegmentType, string> = {
  warmup: "bg-line",
  work: "bg-accent",
  recovery: "bg-muted/40",
  cooldown: "bg-line",
};

interface WorkoutResult {
  plan: WorkoutPlan | null;
  error: string | null;
}

function computeWorkout(settings: IntervalSettings, pace: number | null): WorkoutResult {
  if (settings.kind === "distance" && pace === null) {
    return {
      plan: null,
      error:
        settings.paceMode === "reference"
          ? "Interval berbasis jarak butuh target pace. Isi data tes di Pace Calculator, atau pilih pace manual."
          : "Interval berbasis jarak butuh target pace. Isi pace manual.",
    };
  }
  try {
    const plan = calculateWorkoutDuration({
      warmupSeconds: settings.warmupSeconds,
      coolDownSeconds: settings.coolDownSeconds,
      reps: settings.reps,
      kind: settings.kind,
      intervalDistanceM: settings.distanceM,
      intervalSeconds: settings.durationSeconds,
      paceSecPerKm: pace,
      recoverySeconds: settings.recoverySeconds,
    });
    return { plan, error: null };
  } catch (error) {
    if (error instanceof CalculationError) return { plan: null, error: error.message };
    throw error;
  }
}

function IntervalWorkspace() {
  const { state, update } = useAppState();
  const settings = state.interval;
  const unit = state.preferences.paceUnit;

  function patch(next: Partial<IntervalSettings>): void {
    update((current) => ({ ...current, interval: { ...current.interval, ...next } }));
  }

  const metrics = getReferenceMetrics(state.reference);
  const referencePace = metrics ? Math.round(metrics.training.paces.interval.midSecPerKm) : null;
  const pace = settings.paceMode === "reference" ? referencePace : settings.paceSeconds;
  const { plan, error } = computeWorkout(settings, pace);

  const hrInfo = getHeartRateInfo(state.profile);
  const intervalType = TRAINING_TYPES.interval;
  const hrLow = hrInfo
    ? tryCalc(() => calculateTargetHR({ hrMax: hrInfo.hrMax, rhr: hrInfo.rhr, method: hrInfo.method, effortPercent: intervalType.effortLow }))
    : null;
  const hrHigh = hrInfo
    ? tryCalc(() => calculateTargetHR({ hrMax: hrInfo.hrMax, rhr: hrInfo.rhr, method: hrInfo.method, effortPercent: intervalType.effortHigh }))
    : null;

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="grid grid-cols-1 gap-6">
        <Panel title="Set interval">
          <div className="grid gap-4">
            <SegmentedControl
              label="Jenis interval"
              value={settings.kind}
              options={[
                { value: "distance", label: "Berdasarkan jarak" },
                { value: "time", label: "Berdasarkan waktu" },
              ]}
              onChange={(kind) => patch({ kind })}
            />
            <LiveField
              id="interval-reps"
              label="Jumlah repetisi"
              value={settings.reps}
              format={String}
              parse={(raw) => parseNumber(raw, { label: "Jumlah repetisi", ...LIMITS.reps, integer: true })}
              onCommit={(value) => {
                if (value !== null) patch({ reps: value });
              }}
              inputMode="numeric"
            />
            {settings.kind === "distance" ? (
              <LiveField
                id="interval-distance"
                label="Jarak per repetisi"
                value={settings.distanceM}
                format={String}
                parse={(raw) =>
                  parseNumber(raw, { label: "Jarak interval", ...LIMITS.intervalDistanceM, integer: true })
                }
                onCommit={(value) => {
                  if (value !== null) patch({ distanceM: value });
                }}
                suffix="m"
                inputMode="numeric"
              />
            ) : (
              <LiveField
                id="interval-duration"
                label="Durasi per repetisi"
                value={settings.durationSeconds}
                format={formatClock}
                parse={(raw) =>
                  parseDuration(raw, {
                    label: "Durasi interval",
                    min: LIMITS.intervalSeconds.min,
                    max: LIMITS.intervalSeconds.max,
                  })
                }
                onCommit={(value) => {
                  if (value !== null) patch({ durationSeconds: value });
                }}
                hint="Format mm:ss, contoh 3:00."
              />
            )}
            <LiveField
              id="interval-recovery"
              label="Recovery antar repetisi"
              value={settings.recoverySeconds}
              format={formatClock}
              parse={(raw) =>
                parseDuration(raw, { label: "Recovery", allowZero: true, max: LIMITS.recoverySeconds.max })
              }
              onCommit={(value) => {
                if (value !== null) patch({ recoverySeconds: value });
              }}
              hint="Format mm:ss. Isi 0:00 kalau tanpa recovery."
            />
          </div>
        </Panel>

        <Panel title="Target pace">
          <div className="grid gap-4">
            <SegmentedControl
              label="Sumber pace"
              value={settings.paceMode}
              options={[
                { value: "reference", label: "Dari data tes" },
                { value: "manual", label: "Manual" },
              ]}
              onChange={(paceMode) => patch({ paceMode })}
              hint={
                settings.paceMode === "reference"
                  ? referencePace === null
                    ? "Belum ada data tes. Isi di Pace Calculator."
                    : `Pace interval dari VDOT: ${formatPaceValue(referencePace, unit)} ${paceUnitLabel(unit)}.`
                  : undefined
              }
            />
            {settings.paceMode === "manual" && (
              <LiveField
                key={`manual-${unit}`}
                id="interval-pace"
                label={`Target pace (${paceUnitLabel(unit)})`}
                value={settings.paceSeconds}
                format={(value) => formatPaceValue(value, unit)}
                parse={(raw) => validatePaceInput(raw, unit, "Target pace")}
                onCommit={(value) => patch({ paceSeconds: value })}
                onInvalid={() => patch({ paceSeconds: null })}
                optional={settings.kind === "time"}
                placeholder="4:00"
              />
            )}
          </div>
        </Panel>

        <Panel title="Warm-up dan cool-down">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <LiveField
              id="interval-warmup"
              label="Warm-up"
              value={settings.warmupSeconds}
              format={formatClock}
              parse={(raw) =>
                parseDuration(raw, { label: "Warm-up", allowZero: true, max: LIMITS.warmupSeconds.max })
              }
              onCommit={(value) => {
                if (value !== null) patch({ warmupSeconds: value });
              }}
            />
            <LiveField
              id="interval-cooldown"
              label="Cool-down"
              value={settings.coolDownSeconds}
              format={formatClock}
              parse={(raw) =>
                parseDuration(raw, { label: "Cool-down", allowZero: true, max: LIMITS.warmupSeconds.max })
              }
              onCommit={(value) => {
                if (value !== null) patch({ coolDownSeconds: value });
              }}
            />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {plan === null ? (
          <div className="rounded-xl border border-dashed border-line bg-surface p-6 sm:p-8">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-elevated text-muted">
              <Timer size={20} aria-hidden="true" />
            </span>
            <h2 className="mt-4 text-base font-medium text-ink">Sesi belum bisa dihitung</h2>
            <p className="mt-1 max-w-xl text-sm text-muted">{error}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                emphasis="primary"
                label="Total durasi sesi"
                value={formatClock(plan.totalSeconds)}
                hint={formatDurationWords(plan.totalSeconds)}
                className="sm:col-span-2"
              />
              <MetricCard
                label="Waktu lari interval"
                value={formatClock(plan.workSeconds)}
                hint={plan.workDistanceM === null ? "Jarak tidak diketahui tanpa pace." : `${formatMeters(plan.workDistanceM)} total`}
              />
              <MetricCard
                label="Total recovery"
                value={formatClock(plan.recoverySeconds)}
                hint={`${settings.reps - 1} jeda`}
              />
              <MetricCard
                label="Target pace"
                value={pace === null ? "-" : <PaceDisplay secPerKm={pace} unit={unit} />}
                hint="Pace tiap repetisi."
              />
              <MetricCard
                label="Target heart rate"
                value={hrLow !== null && hrHigh !== null ? `${hrLow} sampai ${hrHigh}` : "-"}
                unit={hrLow !== null && hrHigh !== null ? "bpm" : undefined}
                hint={
                  hrLow !== null
                    ? `Effort interval ${intervalType.effortLow} sampai ${intervalType.effortHigh}%.`
                    : "Isi data heart rate di Pace Calculator untuk melihat HR."
                }
              />
            </div>

            {settings.kind === "time" && pace === null && (
              <Notice>Tanpa target pace, jarak tiap repetisi tidak bisa dihitung. Isi pace manual kalau mau melihatnya.</Notice>
            )}

            <Panel title="Linimasa sesi">
              <div
                className="flex h-5 w-full gap-px overflow-hidden rounded-md"
                role="img"
                aria-label={`Linimasa ${plan.segments.length} segmen, total ${formatDurationWords(plan.totalSeconds)}`}
              >
                {plan.segments.map((segment) => (
                  <div
                    key={segment.label}
                    className={SEGMENT_BAR[segment.type]}
                    style={{ flexGrow: segment.seconds, flexBasis: 0, minWidth: 2 }}
                  />
                ))}
              </div>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted">
                {(Object.keys(SEGMENT_LABELS) as WorkoutSegmentType[]).map((type) => (
                  <li key={type} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-sm ${SEGMENT_BAR[type]}`} aria-hidden="true" />
                    {SEGMENT_LABELS[type]}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Jadwal tiap segmen">
              <div className="max-h-[520px] overflow-auto rounded-lg border border-line">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead className="sticky top-0 bg-elevated text-left text-xs text-muted">
                    <tr>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Segmen
                      </th>
                      <th scope="col" className="px-3 py-2.5 font-medium">
                        Jenis
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">
                        Mulai
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">
                        Durasi
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-medium">
                        Jarak
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.segments.map((segment) => (
                      <tr
                        key={segment.label}
                        className={`border-t border-line ${segment.type === "work" ? "text-ink" : "text-muted"}`}
                      >
                        <th scope="row" className="px-3 py-2 text-left font-normal">
                          {segment.label}
                        </th>
                        <td className="px-3 py-2">{SEGMENT_LABELS[segment.type]}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatClock(segment.startSeconds)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{formatClock(segment.seconds)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {segment.distanceM === null ? "-" : formatMeters(segment.distanceM)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}

export function IntervalView() {
  const { ready } = useAppState();
  return (
    <>
      <PageHeader
        title="Interval Planner"
        description="Susun sesi interval, lihat jadwal tiap repetisi dan total durasinya."
      />
      {ready ? <IntervalWorkspace /> : <LoadingPanel />}
    </>
  );
}
