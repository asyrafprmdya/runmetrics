"use client";

import { Route, RotateCcw } from "lucide-react";
import { PaceChart } from "@/components/charts/PaceChart";
import { SplitTable } from "@/components/split/SplitTable";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingPanel } from "@/components/ui/EmptyState";
import { LiveField } from "@/components/ui/LiveField";
import { MetricCard } from "@/components/ui/MetricCard";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaceDisplay } from "@/components/ui/PaceDisplay";
import { Panel } from "@/components/ui/Panel";
import { SegmentedControl, ToggleField } from "@/components/ui/fields";
import { DISTANCES, RACE_DISTANCE_KEYS, type DistanceKey } from "@/lib/calculations/constants";
import { buildSplitPlan, getPrediction, resolveSplitTarget } from "@/lib/calculations/derive";
import { calculateHalfSplits, type SplitStrategy } from "@/lib/calculations/splits";
import {
  formatClock,
  formatPace,
  formatPaceValue,
  formatSignedClock,
  paceToUnit,
  paceUnitLabel,
} from "@/lib/format";
import { STRATEGY_HINTS, STRATEGY_LABELS, TARGET_MODE_LABELS } from "@/lib/labels";
import { useAppState } from "@/lib/storage/useAppState";
import type { SegmentLength, SplitSettings, TargetMode } from "@/lib/types";
import { validateChangePercent, validatePaceInput, validateRaceTarget } from "@/lib/validation";

const STRATEGIES: SplitStrategy[] = ["even", "negative", "positive"];
const TARGET_MODES: TargetMode[] = ["finish", "pace", "predicted"];
const SEGMENT_OPTIONS: SegmentLength[] = [1, 2, 5];

function SplitWorkspace() {
  const { state, update } = useAppState();
  const unit = state.preferences.paceUnit;
  const settings = state.split;
  const raceKm = DISTANCES[state.race.distanceKey].km;

  function patchSplit(patch: Partial<SplitSettings>): void {
    update((current) => ({ ...current, split: { ...current.split, ...patch } }));
  }

  function setDistance(key: DistanceKey): void {
    update((current) => {
      const target = current.race.targetSeconds;
      const pace = target === null ? 0 : target / DISTANCES[key].km;
      const keep = target !== null && pace >= 120 && pace <= 900;
      return {
        ...current,
        race: { distanceKey: key, targetSeconds: keep ? target : null },
        split: { ...current.split, overrides: {} },
      };
    });
  }

  function editSplit(index: number, seconds: number | null): void {
    update((current) => {
      const overrides = { ...current.split.overrides };
      if (seconds === null) delete overrides[String(index)];
      else overrides[String(index)] = seconds;
      return { ...current, split: { ...current.split, overrides } };
    });
  }

  const target = resolveSplitTarget(state);
  const plan = buildSplitPlan(state);
  const prediction = getPrediction(state);
  const editedCount = plan ? plan.rows.filter((row) => row.edited).length : 0;
  const halves = plan ? calculateHalfSplits(plan.rows, raceKm) : null;
  const halfDelta = halves ? halves.secondHalfPaceSecPerKm - halves.firstHalfPaceSecPerKm : 0;

  let chartSummary = "";
  if (plan) {
    const paces = plan.rows.map((row) => row.paceSecPerKm);
    const fastest = Math.min(...paces);
    const slowest = Math.max(...paces);
    chartSummary = `Pace awal ${formatPace(paces[0], unit)}, pace akhir ${formatPace(paces[paces.length - 1], unit)}, tercepat ${formatPace(fastest, unit)}, terlambat ${formatPace(slowest, unit)}.`;
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="grid grid-cols-1 gap-6">
        <Panel title="Lomba dan target">
          <div className="grid gap-4">
            <SegmentedControl
              label="Jarak lomba"
              value={state.race.distanceKey}
              options={RACE_DISTANCE_KEYS.map((key) => ({ value: key, label: DISTANCES[key].label }))}
              onChange={setDistance}
              columns={2}
            />
            <SegmentedControl
              label="Acuan target"
              value={settings.targetMode}
              options={TARGET_MODES.map((mode) => ({ value: mode, label: TARGET_MODE_LABELS[mode] }))}
              onChange={(targetMode) => patchSplit({ targetMode })}
              columns={3}
            />
            {settings.targetMode === "finish" && (
              <LiveField
                key={`finish-${state.race.distanceKey}`}
                id="split-finish"
                label="Target waktu finish"
                value={state.race.targetSeconds}
                format={formatClock}
                parse={(raw) => validateRaceTarget(raw, state.race.distanceKey)}
                onCommit={(value) =>
                  update((current) => ({ ...current, race: { ...current.race, targetSeconds: value } }))
                }
                onInvalid={() =>
                  update((current) => ({ ...current, race: { ...current.race, targetSeconds: null } }))
                }
                placeholder="50:00"
                hint="Format mm:ss atau h:mm:ss."
              />
            )}
            {settings.targetMode === "pace" && (
              <LiveField
                key={`pace-${unit}`}
                id="split-pace"
                label={`Target average pace (${paceUnitLabel(unit)})`}
                value={settings.targetPaceSeconds}
                format={(value) => formatPaceValue(value, unit)}
                parse={(raw) => validatePaceInput(raw, unit, "Target pace")}
                onCommit={(value) => patchSplit({ targetPaceSeconds: value })}
                onInvalid={() => patchSplit({ targetPaceSeconds: null })}
                placeholder="5:00"
                hint="Format mm:ss. Total waktu dihitung dari pace dikali jarak."
              />
            )}
            {settings.targetMode === "predicted" && (
              <Notice>
                {prediction
                  ? `Memakai prediksi Race Predictor: ${formatClock(prediction.seconds)}.`
                  : "Belum ada prediksi. Isi hasil tes di Race Predictor atau Pace Calculator."}
              </Notice>
            )}
          </div>
        </Panel>

        <Panel title="Strategi pacing">
          <div className="grid gap-4">
            <SegmentedControl
              label="Strategi"
              value={settings.strategy}
              options={STRATEGIES.map((strategy) => ({ value: strategy, label: STRATEGY_LABELS[strategy] }))}
              onChange={(strategy) => patchSplit({ strategy })}
              hint={STRATEGY_HINTS[settings.strategy]}
              columns={3}
            />
            {settings.strategy !== "even" && (
              <LiveField
                id="split-change"
                label="Perubahan pace awal ke akhir"
                value={settings.changePercent}
                format={String}
                parse={validateChangePercent}
                onCommit={(value) => {
                  if (value !== null) patchSplit({ changePercent: value });
                }}
                suffix="%"
                inputMode="decimal"
                hint="Selisih pace antara km awal dan km akhir, dalam persen dari average pace. Contoh 3% di 5:00 /km sekitar 9 detik."
              />
            )}
            <SegmentedControl
              label="Panjang tiap split"
              value={settings.segmentKm}
              options={SEGMENT_OPTIONS.map((value) => ({ value, label: `${value} km` }))}
              onChange={(segmentKm) => patchSplit({ segmentKm, overrides: {} })}
              hint="Mengubah panjang split menghapus edit manual."
            />
            <ToggleField
              id="split-lock"
              label="Kunci total waktu"
              description="Kalau satu split diedit, split lain menyesuaikan supaya total tetap sama dengan target."
              checked={settings.lockTotal}
              onChange={(lockTotal) => patchSplit({ lockTotal })}
            />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {plan === null ? (
          <EmptyState
            icon={<Route size={20} aria-hidden="true" />}
            title="Rencana split belum bisa dibuat"
            description={target.message ?? "Data belum cukup untuk membuat rencana split."}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                emphasis="primary"
                label={`Total finish ${DISTANCES[state.race.distanceKey].label}`}
                value={formatClock(plan.totalSeconds)}
                hint={
                  plan.differenceSeconds === 0
                    ? "Sama dengan target."
                    : `Berbeda ${formatSignedClock(plan.differenceSeconds)} dari target ${formatClock(plan.targetSeconds)}.`
                }
                className="lg:col-span-1"
              />
              <MetricCard
                label="Average pace"
                value={<PaceDisplay secPerKm={plan.avgPaceSecPerKm} unit={unit} />}
              />
              {halves && (
                <MetricCard
                  label="Paruh kedua"
                  value={
                    Math.abs(halfDelta) < 0.5
                      ? "Sama"
                      : `${Math.round(Math.abs(paceToUnit(halfDelta, unit)))} dtk`
                  }
                  hint={
                    Math.abs(halfDelta) < 0.5
                      ? `Pace kedua paruh sama, ${formatPace(halves.firstHalfPaceSecPerKm, unit)}.`
                      : `${halfDelta < 0 ? "Lebih cepat" : "Lebih lambat"} per ${unit === "mi" ? "mil" : "km"}: ${formatPaceValue(halves.firstHalfPaceSecPerKm, unit)} lalu ${formatPaceValue(halves.secondHalfPaceSecPerKm, unit)}.`
                  }
                />
              )}
            </div>

            {plan.warnings.map((warning) => (
              <Notice key={warning} tone="warn">
                {warning}
              </Notice>
            ))}

            <Panel title="Pace sepanjang lomba">
              <PaceChart
                rows={plan.rows}
                unit={unit}
                averagePaceSecPerKm={plan.avgPaceSecPerKm}
                summary={chartSummary}
              />
            </Panel>

            <Panel
              title="Tabel split"
              description="Klik waktu split untuk mengedit. Tekan Enter atau pindah field untuk menyimpan."
              action={
                editedCount > 0 ? (
                  <Button
                    variant="secondary"
                    icon={<RotateCcw size={16} aria-hidden="true" />}
                    onClick={() => patchSplit({ overrides: {} })}
                  >
                    Reset {editedCount} edit
                  </Button>
                ) : undefined
              }
            >
              <SplitTable
                rows={plan.rows}
                unit={unit}
                segmentKm={settings.segmentKm}
                editable
                onEdit={editSplit}
              />
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}

export function SplitPlannerView() {
  const { ready } = useAppState();
  return (
    <>
      <PageHeader
        title="Split Planner"
        description="Susun pembagian pace lomba. Edit split manual, total waktu dan pace dihitung ulang otomatis."
      />
      {ready ? <SplitWorkspace /> : <LoadingPanel />}
    </>
  );
}
