"use client";

import { Activity } from "lucide-react";
import Link from "next/link";
import { HeartRateZoneChart } from "@/components/charts/HeartRateZoneChart";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, LoadingPanel } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaceDisplay, PaceRange } from "@/components/ui/PaceDisplay";
import { Panel } from "@/components/ui/Panel";
import { TrainingTypeBadge } from "@/components/ui/TrainingTypeBadge";
import { DISTANCES } from "@/lib/calculations/constants";
import {
  buildSplitPlan,
  getHeartRateInfo,
  getPrediction,
  getReferenceMetrics,
  resolveSplitTarget,
} from "@/lib/calculations/derive";
import { calculateHalfSplits } from "@/lib/calculations/splits";
import { formatClock, formatPace } from "@/lib/format";
import { HR_METHOD_LABELS, STRATEGY_LABELS } from "@/lib/labels";
import { useAppState } from "@/lib/storage/useAppState";
import type { AppState } from "@/lib/types";

function PacingSummary({ state }: { state: AppState }) {
  const unit = state.preferences.paceUnit;
  const plan = buildSplitPlan(state);
  const target = resolveSplitTarget(state);
  const raceKm = DISTANCES[state.race.distanceKey].km;

  if (plan === null) {
    return (
      <Notice>
        {target.message ?? "Rencana split belum bisa dibuat."}{" "}
        <Link href="/split-planner" className="text-accent underline underline-offset-2">
          Buka Split Planner
        </Link>
      </Notice>
    );
  }

  const halves = calculateHalfSplits(plan.rows, raceKm);
  return (
    <dl className="grid gap-3 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Strategi</dt>
        <dd className="text-ink">{STRATEGY_LABELS[state.split.strategy]}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Jarak</dt>
        <dd className="text-ink">{DISTANCES[state.race.distanceKey].label}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Total finish</dt>
        <dd className="tabular-nums text-ink">{formatClock(plan.totalSeconds)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Paruh pertama</dt>
        <dd className="tabular-nums text-ink">{formatPace(halves.firstHalfPaceSecPerKm, unit)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted">Paruh kedua</dt>
        <dd className="tabular-nums text-ink">{formatPace(halves.secondHalfPaceSecPerKm, unit)}</dd>
      </div>
    </dl>
  );
}

function DashboardContent() {
  const { state } = useAppState();
  const unit = state.preferences.paceUnit;
  const metrics = getReferenceMetrics(state.reference);
  const hr = getHeartRateInfo(state.profile);
  const prediction = getPrediction(state);

  if (metrics === null && hr === null) {
    return (
      <EmptyState
        icon={<Activity size={20} aria-hidden="true" />}
        title="Belum ada data"
        description="Dashboard terisi setelah kamu memasukkan hasil tes lari (jarak dan waktu) dan data heart rate (umur atau HRmax). Semua angka dihitung dari input kamu, tidak ada data contoh."
        actionHref="/calculator"
        actionLabel="Mulai di Pace Calculator"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <MetricCard
          emphasis="primary"
          label={`Prediksi finish ${DISTANCES[state.race.distanceKey].label}`}
          value={prediction ? formatClock(prediction.seconds) : "-"}
          hint={
            prediction
              ? `${formatPace(prediction.avgPaceSecPerKm, unit)} dari tes ${DISTANCES[state.reference.distanceKey].label} ${formatClock(state.reference.timeSeconds ?? 0)}. Estimasi, bukan jaminan.`
              : "Isi waktu tes untuk melihat prediksi."
          }
        />
        <MetricCard
          emphasis="primary"
          label="Reference pace"
          value={metrics ? <PaceDisplay secPerKm={metrics.paceSecPerKm} unit={unit} /> : "-"}
          hint={
            metrics
              ? `Dari tes ${DISTANCES[state.reference.distanceKey].label}, VDOT ${metrics.vdot.toFixed(1)}.`
              : "Isi hasil tes untuk melihat pace referensi."
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="HRmax" value={hr ? hr.hrMax : "-"} unit={hr ? "bpm" : undefined} />
        <MetricCard label="Resting HR" value={hr?.rhr ?? "-"} unit={hr?.rhr ? "bpm" : undefined} />
        <MetricCard
          label="Pace easy"
          value={metrics ? <PaceDisplay secPerKm={metrics.training.paces.easy.midSecPerKm} unit={unit} /> : "-"}
        />
        <MetricCard
          label="Pace threshold"
          value={metrics ? <PaceDisplay secPerKm={metrics.training.paces.threshold.midSecPerKm} unit={unit} /> : "-"}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel
          title="Zona heart rate"
          description={hr ? `Metode ${HR_METHOD_LABELS[hr.method]}.` : undefined}
        >
          {hr ? (
            <HeartRateZoneChart zones={hr.zones} />
          ) : (
            <Notice>
              Isi umur atau HRmax (dan RHR untuk Karvonen) di Pace Calculator atau Settings untuk melihat zona.
            </Notice>
          )}
        </Panel>

        <Panel
          title="Strategi pacing"
          action={
            <ButtonLink href="/split-planner" variant="ghost">
              Buka
            </ButtonLink>
          }
        >
          <PacingSummary state={state} />
        </Panel>
      </div>

      {metrics && (
        <Panel title="Target pace latihan">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(["easy", "tempo", "threshold", "interval"] as const).map((type) => (
              <li key={type} className="rounded-lg border border-line bg-bg p-3">
                <TrainingTypeBadge type={type} />
                <p className="mt-2 text-sm text-ink">
                  <PaceRange
                    fastSecPerKm={metrics.training.paces[type].fastSecPerKm}
                    slowSecPerKm={metrics.training.paces[type].slowSecPerKm}
                    unit={unit}
                  />
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}

export function DashboardView() {
  const { ready } = useAppState();
  return (
    <>
      <PageHeader
        title="Running Overview"
        description="Ringkasan performa referensi, zona heart rate, prediksi finish, dan strategi pacing terakhir."
      />
      {ready ? <DashboardContent /> : <LoadingPanel />}
    </>
  );
}
