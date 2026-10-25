"use client";

import { Calculator, Gauge } from "lucide-react";
import { useState } from "react";
import { HeartRateZoneChart } from "@/components/charts/HeartRateZoneChart";
import { ProfileFields } from "@/components/shared/ProfileFields";
import { ReferenceFields } from "@/components/shared/ReferenceFields";
import { Button } from "@/components/ui/Button";
import { EmptyState, LoadingPanel } from "@/components/ui/EmptyState";
import { MetricCard } from "@/components/ui/MetricCard";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaceDisplay, PaceRange } from "@/components/ui/PaceDisplay";
import { Panel } from "@/components/ui/Panel";
import { TextField, SelectField } from "@/components/ui/fields";
import { TrainingTypeBadge } from "@/components/ui/TrainingTypeBadge";
import { useToast } from "@/components/ui/Toast";
import { TRAINING_TYPES, TRAINING_TYPE_KEYS, type TrainingType } from "@/lib/calculations/constants";
import { getHeartRateInfo, getReferenceMetrics } from "@/lib/calculations/derive";
import { calculateTargetHR } from "@/lib/calculations/heartRate";
import { tryCalc } from "@/lib/calculations/errors";
import { formatPace } from "@/lib/format";
import { HR_METHOD_LABELS } from "@/lib/labels";
import { useAppState } from "@/lib/storage/useAppState";
import type { AppState, Profile } from "@/lib/types";
import {
  validateEffort,
  validateProfileDraft,
  type ProfileDraft,
  type ProfileErrors,
} from "@/lib/validation";
import {
  localDateString,
  profileToDraft,
  referenceToDraft,
  validateReferenceDraft,
  type ReferenceDraft,
  type ReferenceErrors,
} from "@/lib/validation/drafts";

function midEffort(type: TrainingType): number {
  const info = TRAINING_TYPES[type];
  return Math.round((info.effortLow + info.effortHigh) / 2);
}

function hrAt(state: AppState, effortPercent: number): number | null {
  const info = getHeartRateInfo(state.profile);
  if (info === null) return null;
  return tryCalc(() =>
    calculateTargetHR({ hrMax: info.hrMax, rhr: info.rhr, method: info.method, effortPercent }),
  );
}

function CalculatorForm() {
  const { state, update } = useAppState();
  const toast = useToast();
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>(() => profileToDraft(state.profile));
  const [referenceDraft, setReferenceDraft] = useState<ReferenceDraft>(() => referenceToDraft(state.reference));
  const [trainingType, setTrainingType] = useState<TrainingType>(state.calculator.trainingType);
  const [effort, setEffort] = useState(String(state.calculator.effortPercent));
  const [profileErrors, setProfileErrors] = useState<ProfileErrors>({});
  const [referenceErrors, setReferenceErrors] = useState<ReferenceErrors>({});
  const [effortError, setEffortError] = useState<string | null>(null);

  function handleTypeChange(value: string): void {
    const next = value as TrainingType;
    setTrainingType(next);
    setEffort(String(midEffort(next)));
    setEffortError(null);
  }

  function handleCalculate(): void {
    const hrBlank =
      profileDraft.hrMaxMode === "estimate" &&
      profileDraft.hrMethod === "hrmax" &&
      profileDraft.age.trim() === "" &&
      profileDraft.rhr.trim() === "";

    let profile: Profile | null;
    let nextProfileErrors: ProfileErrors = {};
    if (hrBlank) {
      profile = { age: null, rhr: null, hrMax: null, hrMaxMode: "estimate", hrMethod: "hrmax" };
    } else {
      const validation = validateProfileDraft(profileDraft);
      profile = validation.profile;
      nextProfileErrors = validation.errors;
    }

    const referenceValidation = validateReferenceDraft(referenceDraft, localDateString(new Date()), true);
    const effortResult = validateEffort(effort);

    setProfileErrors(nextProfileErrors);
    setReferenceErrors(referenceValidation.errors);
    setEffortError(effortResult.ok ? null : effortResult.error);

    if (profile === null || referenceValidation.reference === null || !effortResult.ok) {
      toast("Ada input yang belum valid. Cek pesan di bawah field.", "error");
      return;
    }

    const nextProfile = profile;
    const nextReference = referenceValidation.reference;
    const nextEffort = effortResult.value;
    const saved = update((current) => ({
      ...current,
      profile: nextProfile,
      reference: nextReference,
      calculator: { trainingType, effortPercent: nextEffort },
    }));
    if (saved) toast("Dihitung dan disimpan di browser ini.");
    else toast("Dihitung, tapi gagal menyimpan ke browser. Cek pengaturan penyimpanan.", "error");
  }

  const typeInfo = TRAINING_TYPES[trainingType];

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        handleCalculate();
      }}
      className="grid grid-cols-1 gap-6"
    >
      <Panel title="Performa referensi" description="Dasar semua estimasi pace.">
        <ReferenceFields
          idPrefix="calc-ref"
          draft={referenceDraft}
          errors={referenceErrors}
          onChange={(patch) => setReferenceDraft((current) => ({ ...current, ...patch }))}
        />
      </Panel>

      <Panel title="Heart rate" description="Opsional kalau cuma butuh pace. Kosongkan semua untuk melewati.">
        <ProfileFields
          idPrefix="calc-hr"
          draft={profileDraft}
          errors={profileErrors}
          onChange={(patch) => setProfileDraft((current) => ({ ...current, ...patch }))}
        />
      </Panel>

      <Panel title="Jenis latihan">
        <div className="grid gap-4">
          <SelectField
            id="calc-type"
            label="Jenis latihan"
            value={trainingType}
            onChange={handleTypeChange}
            options={TRAINING_TYPE_KEYS.map((key) => ({ value: key, label: TRAINING_TYPES[key].label }))}
            hint={typeInfo.description}
          />
          <TextField
            id="calc-effort"
            label="Target effort"
            value={effort}
            onChange={setEffort}
            error={effortError}
            suffix="%"
            inputMode="decimal"
            hint={`Rentang umum untuk ${typeInfo.label}: ${typeInfo.effortLow} sampai ${typeInfo.effortHigh}%. Dipakai untuk target heart rate.`}
          />
        </div>
      </Panel>

      <Button type="submit" variant="primary" icon={<Calculator size={18} aria-hidden="true" />} className="w-full sm:w-auto sm:self-start">
        Calculate
      </Button>
    </form>
  );
}

function CalculatorResults() {
  const { state } = useAppState();
  const unit = state.preferences.paceUnit;
  const metrics = getReferenceMetrics(state.reference);

  if (metrics === null) {
    return (
      <EmptyState
        icon={<Gauge size={20} aria-hidden="true" />}
        title="Belum ada hasil"
        description="Isi jarak dan waktu tes terbaru, lalu tekan Calculate. Angka pace baru muncul setelah data minimum lengkap."
      />
    );
  }

  const type = state.calculator.trainingType;
  const effort = state.calculator.effortPercent;
  const range = metrics.training.paces[type];
  const info = getHeartRateInfo(state.profile);
  const targetHr = hrAt(state, effort);

  return (
    <div className="grid grid-cols-1 gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          emphasis="primary"
          label={`Target pace ${TRAINING_TYPES[type].label}`}
          value={<PaceDisplay secPerKm={range.midSecPerKm} unit={unit} />}
          hint={
            <>
              Rentang <PaceRange fastSecPerKm={range.fastSecPerKm} slowSecPerKm={range.slowSecPerKm} unit={unit} />
            </>
          }
        />
        <MetricCard
          label="Target heart rate"
          value={targetHr === null ? "-" : targetHr}
          unit={targetHr === null ? undefined : "bpm"}
          hint={
            targetHr === null
              ? "Isi umur atau HRmax di form untuk melihat target HR."
              : `Effort ${effort}% dengan ${info ? HR_METHOD_LABELS[info.method] : ""}`
          }
        />
        <MetricCard
          label="Reference pace"
          value={<PaceDisplay secPerKm={metrics.paceSecPerKm} unit={unit} />}
          hint="Rata-rata dari hasil tes."
        />
        <MetricCard label="VDOT" value={metrics.vdot.toFixed(1)} hint="Skor kebugaran dari hasil tes." />
      </div>

      <Panel title="Estimasi pace semua jenis latihan">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead className="text-left text-xs text-muted">
              <tr>
                <th scope="col" className="pb-2 font-medium">
                  Jenis
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Rentang pace
                </th>
                <th scope="col" className="pb-2 font-medium">
                  Target HR
                </th>
              </tr>
            </thead>
            <tbody>
              {TRAINING_TYPE_KEYS.map((key) => {
                const row = metrics.training.paces[key];
                const info2 = TRAINING_TYPES[key];
                const low = hrAt(state, info2.effortLow);
                const high = hrAt(state, info2.effortHigh);
                const selected = key === type;
                return (
                  <tr
                    key={key}
                    aria-current={selected ? "true" : undefined}
                    className={`border-t border-line ${selected ? "bg-elevated" : ""}`}
                  >
                    <th scope="row" className="py-3 pr-3 text-left font-normal">
                      <TrainingTypeBadge type={key} />
                      {selected && <span className="ml-2 text-xs text-accent">dipilih</span>}
                    </th>
                    <td className="py-3 pr-3 tabular-nums">
                      <PaceRange fastSecPerKm={row.fastSecPerKm} slowSecPerKm={row.slowSecPerKm} unit={unit} />
                    </td>
                    <td className="py-3 tabular-nums text-muted">
                      {low !== null && high !== null ? `${low} sampai ${high} bpm` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        title="Zona heart rate"
        description={info ? `HRmax ${info.hrMax} bpm, metode ${HR_METHOD_LABELS[info.method]}.` : undefined}
      >
        {info ? (
          <HeartRateZoneChart zones={info.zones} highlightBpm={targetHr} />
        ) : (
          <Notice>Isi umur atau HRmax (dan RHR untuk Karvonen) untuk menghitung zona.</Notice>
        )}
      </Panel>

      <Panel title="Cara menghitungnya">
        <ul className="grid gap-2 text-sm text-muted">
          <li>
            Pace training dihitung dari hasil tesmu lewat model VDOT (Daniels dan Gilbert): waktu tes diubah jadi skor
            kebugaran, lalu tiap jenis latihan dipetakan ke persen VO2max. Easy 60 sampai 72%, tempo 80 sampai 85%,
            threshold 86 sampai 89%, interval 95 sampai 99%.
          </li>
          <li>
            HRmax estimasi memakai 208 - (0,7 x umur). Itu rata-rata populasi, individu bisa meleset belasan bpm.
            Karvonen memakai RHR + effort x (HRmax - RHR).
          </li>
          <li>
            Persen effort heart rate tidak diubah jadi persen pace. Keduanya dihitung terpisah dan cuma jadi panduan
            tambahan satu sama lain.
          </li>
          <li>
            Reference pace kamu {formatPace(metrics.paceSecPerKm, unit)}. Hasil ini estimasi, bukan jaminan. Cuaca,
            medan, dan kondisi badan ikut menentukan.
          </li>
        </ul>
      </Panel>
    </div>
  );
}

export function CalculatorView() {
  const { ready } = useAppState();
  return (
    <>
      <PageHeader
        title="Pace Calculator"
        description="Masukkan hasil tes terbaru dan data heart rate, lalu hitung target pace dan HR untuk tiap jenis latihan."
      />
      {ready ? (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
          <CalculatorForm />
          <CalculatorResults />
        </div>
      ) : (
        <LoadingPanel />
      )}
    </>
  );
}
