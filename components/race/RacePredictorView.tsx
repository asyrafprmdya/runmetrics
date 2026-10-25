"use client";

import { ArrowDown, ArrowUp, Equal, Flag } from "lucide-react";
import { SplitTable } from "@/components/split/SplitTable";
import { EmptyState, LoadingPanel } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaceDisplay } from "@/components/ui/PaceDisplay";
import { Panel } from "@/components/ui/Panel";
import { SegmentedControl } from "@/components/ui/fields";
import { LiveField } from "@/components/ui/LiveField";
import {
  DISTANCES,
  RACE_DISTANCE_KEYS,
  TEST_DISTANCE_KEYS,
  type DistanceKey,
  type TestDistanceKey,
} from "@/lib/calculations/constants";
import { getPrediction } from "@/lib/calculations/derive";
import { tryCalc } from "@/lib/calculations/errors";
import { compareToTarget } from "@/lib/calculations/race";
import { generateRaceSplits } from "@/lib/calculations/splits";
import { formatClock } from "@/lib/format";
import { useAppState } from "@/lib/storage/useAppState";
import { isPlausibleTest, validateRaceTarget, validateTestTime } from "@/lib/validation";

function RaceWorkspace() {
  const { state, update } = useAppState();
  const unit = state.preferences.paceUnit;
  const referenceKm = DISTANCES[state.reference.distanceKey].km;
  const raceKm = DISTANCES[state.race.distanceKey].km;

  function setReferenceDistance(key: TestDistanceKey): void {
    update((current) => {
      const km = DISTANCES[key].km;
      const seconds = current.reference.timeSeconds;
      const keep = seconds !== null && isPlausibleTest(km, seconds).ok;
      return { ...current, reference: { ...current.reference, distanceKey: key, timeSeconds: keep ? seconds : null } };
    });
  }

  function setRaceDistance(key: DistanceKey): void {
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

  const prediction = getPrediction(state);
  const comparison =
    prediction !== null && state.race.targetSeconds !== null
      ? tryCalc(() => compareToTarget(prediction.seconds, state.race.targetSeconds as number))
      : null;
  const splits =
    prediction === null
      ? null
      : tryCalc(() =>
          generateRaceSplits({
            distanceKm: raceKm,
            targetSeconds: prediction.seconds,
            strategy: "even",
            changePercent: 0,
            segmentKm: 1,
          }),
        );

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="grid grid-cols-1 gap-6">
        <Panel title="Hasil tes atau race terbaru" description="Berubah di sini langsung memperbarui prediksi.">
          <div className="grid gap-4">
            <SegmentedControl
              label="Jarak tes"
              value={state.reference.distanceKey}
              options={TEST_DISTANCE_KEYS.map((key) => ({ value: key, label: DISTANCES[key].label }))}
              onChange={setReferenceDistance}
              columns={3}
            />
            <LiveField
              key={`ref-${state.reference.distanceKey}`}
              id="race-ref-time"
              label="Waktu finish tes"
              value={state.reference.timeSeconds}
              format={formatClock}
              parse={(raw) => validateTestTime(raw, referenceKm)}
              onCommit={(value) =>
                update((current) => ({ ...current, reference: { ...current.reference, timeSeconds: value } }))
              }
              onInvalid={() =>
                update((current) => ({ ...current, reference: { ...current.reference, timeSeconds: null } }))
              }
              placeholder="25:30"
              hint="Format mm:ss atau h:mm:ss."
            />
          </div>
        </Panel>

        <Panel title="Lomba target">
          <div className="grid gap-4">
            <SegmentedControl
              label="Jarak lomba"
              value={state.race.distanceKey}
              options={RACE_DISTANCE_KEYS.map((key) => ({ value: key, label: DISTANCES[key].label }))}
              onChange={setRaceDistance}
              columns={2}
            />
            <LiveField
              key={`target-${state.race.distanceKey}`}
              id="race-target"
              label="Target waktu finish (opsional)"
              value={state.race.targetSeconds}
              format={formatClock}
              parse={(raw) => validateRaceTarget(raw, state.race.distanceKey)}
              onCommit={(value) => update((current) => ({ ...current, race: { ...current.race, targetSeconds: value } }))}
              optional
              placeholder="50:00"
              hint="Dipakai juga oleh Split Planner."
            />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {prediction === null ? (
          <EmptyState
            icon={<Flag size={20} aria-hidden="true" />}
            title="Belum ada prediksi"
            description="Isi waktu finish tes yang valid. Prediksi dihitung dari rumus Riegel dan langsung berubah saat data referensi diubah."
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                emphasis="primary"
                label={`Prediksi finish ${DISTANCES[state.race.distanceKey].label}`}
                value={formatClock(prediction.seconds)}
                hint="Estimasi matematis, bukan hasil aktual."
                className="sm:col-span-2"
              />
              <MetricCard
                label="Average pace"
                value={<PaceDisplay secPerKm={prediction.avgPaceSecPerKm} unit={unit} />}
              />
              <MetricCard
                label="Terhadap target"
                value={
                  comparison === null
                    ? "-"
                    : comparison.status === "on-target"
                      ? "Pas"
                      : formatClock(Math.abs(comparison.differenceSeconds))
                }
                hint={
                  comparison === null ? (
                    "Isi target waktu untuk membandingkan."
                  ) : comparison.status === "faster" ? (
                    <span className="inline-flex items-center gap-1.5 text-ok">
                      <ArrowDown size={14} aria-hidden="true" /> Prediksi lebih cepat dari target
                    </span>
                  ) : comparison.status === "slower" ? (
                    <span className="inline-flex items-center gap-1.5 text-warn">
                      <ArrowUp size={14} aria-hidden="true" /> Prediksi lebih lambat dari target
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-ok">
                      <Equal size={14} aria-hidden="true" /> Prediksi sama dengan target
                    </span>
                  )
                }
              />
            </div>

            {prediction.warning && <Notice tone="warn">{prediction.warning}</Notice>}

            <Notice>
              Prediksi memakai rumus Riegel: T2 = T1 x (D2 / D1)^1,06. Ini estimasi dari satu data tes, bukan jaminan.
              Daya tahan, latihan, rute, dan cuaca bisa menggeser hasil nyata.
            </Notice>

            {splits && (
              <Panel title="Estimasi split per kilometer" description="Even split dari waktu prediksi. Susun strategi lain di Split Planner.">
                <SplitTable rows={splits.rows} unit={unit} segmentKm={1} editable={false} />
              </Panel>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function RacePredictorView() {
  const { ready } = useAppState();
  return (
    <>
      <PageHeader
        title="Race Predictor"
        description="Perkirakan waktu finish lomba dari hasil tes atau race terbarumu."
      />
      {ready ? <RaceWorkspace /> : <LoadingPanel />}
    </>
  );
}
