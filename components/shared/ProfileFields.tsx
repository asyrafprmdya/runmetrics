"use client";

import { LIMITS } from "@/lib/calculations/constants";
import { calculateMaxHeartRate } from "@/lib/calculations/heartRate";
import { HR_METHOD_LABELS } from "@/lib/labels";
import { parseNumber, type ProfileDraft, type ProfileErrors } from "@/lib/validation";
import { SegmentedControl, TextField } from "@/components/ui/fields";

interface ProfileFieldsProps {
  idPrefix: string;
  draft: ProfileDraft;
  errors: ProfileErrors;
  onChange: (patch: Partial<ProfileDraft>) => void;
}

export function ProfileFields({ idPrefix, draft, errors, onChange }: ProfileFieldsProps) {
  const age = parseNumber(draft.age, { label: "Umur", ...LIMITS.age, integer: true });
  const estimated = age.ok ? calculateMaxHeartRate(age.value) : null;
  const estimateMode = draft.hrMaxMode === "estimate";

  return (
    <div className="grid gap-4">
      <SegmentedControl
        label="Sumber HRmax"
        value={draft.hrMaxMode}
        options={[
          { value: "estimate", label: "Estimasi dari umur" },
          { value: "manual", label: "Input manual" },
        ]}
        onChange={(hrMaxMode) => onChange({ hrMaxMode })}
      />

      <TextField
        id={`${idPrefix}-age`}
        label={estimateMode ? "Umur" : "Umur (opsional)"}
        value={draft.age}
        onChange={(age) => onChange({ age })}
        error={errors.age}
        suffix="tahun"
        inputMode="numeric"
        placeholder="30"
        hint={
          estimateMode && estimated !== null
            ? `HRmax estimasi ${estimated} bpm, dari rumus 208 - (0,7 x umur). Ini perkiraan, bukan nilai pasti.`
            : estimateMode
              ? "Dipakai untuk mengestimasi HRmax."
              : undefined
        }
      />

      {!estimateMode && (
        <TextField
          id={`${idPrefix}-hrmax`}
          label="HRmax aktual"
          value={draft.hrMax}
          onChange={(hrMax) => onChange({ hrMax })}
          error={errors.hrMax}
          suffix="bpm"
          inputMode="numeric"
          placeholder="190"
          hint="Dari tes lapangan atau data jam lari."
        />
      )}

      <TextField
        id={`${idPrefix}-rhr`}
        label={draft.hrMethod === "karvonen" ? "Resting heart rate (RHR)" : "Resting heart rate (RHR), opsional"}
        value={draft.rhr}
        onChange={(rhr) => onChange({ rhr })}
        error={errors.rhr}
        suffix="bpm"
        inputMode="numeric"
        placeholder="55"
        hint="Ukur pagi hari sebelum bangun dari tempat tidur."
      />

      <SegmentedControl
        label="Metode zona HR"
        value={draft.hrMethod}
        options={[
          { value: "hrmax", label: HR_METHOD_LABELS.hrmax },
          { value: "karvonen", label: HR_METHOD_LABELS.karvonen },
        ]}
        onChange={(hrMethod) => onChange({ hrMethod })}
        hint={
          draft.hrMethod === "karvonen"
            ? "Target HR = RHR + effort x (HRmax - RHR). Butuh RHR."
            : "Target HR = effort x HRmax."
        }
      />
    </div>
  );
}
