"use client";

import { DISTANCES, TEST_DISTANCE_KEYS } from "@/lib/calculations/constants";
import type { ReferenceDraft, ReferenceErrors } from "@/lib/validation/drafts";
import { SegmentedControl, TextField } from "@/components/ui/fields";

interface ReferenceFieldsProps {
  idPrefix: string;
  draft: ReferenceDraft;
  errors: ReferenceErrors;
  onChange: (patch: Partial<ReferenceDraft>) => void;
  showDate?: boolean;
  timeOptional?: boolean;
}

export function ReferenceFields({
  idPrefix,
  draft,
  errors,
  onChange,
  showDate = false,
  timeOptional = false,
}: ReferenceFieldsProps) {
  return (
    <div className="grid gap-4">
      <SegmentedControl
        label="Jarak tes"
        value={draft.distanceKey}
        options={TEST_DISTANCE_KEYS.map((key) => ({ value: key, label: DISTANCES[key].label }))}
        onChange={(distanceKey) => onChange({ distanceKey })}
        columns={3}
      />
      <TextField
        id={`${idPrefix}-time`}
        label={timeOptional ? "Waktu finish tes (opsional)" : "Waktu finish tes"}
        value={draft.time}
        onChange={(time) => onChange({ time })}
        error={errors.time}
        placeholder="25:30"
        inputMode="text"
        hint="Format mm:ss atau h:mm:ss. Pakai hasil tes atau race terbaru, usaha maksimal."
      />
      {showDate && (
        <TextField
          id={`${idPrefix}-date`}
          label="Tanggal tes (opsional)"
          type="date"
          value={draft.testDate}
          onChange={(testDate) => onChange({ testDate })}
          error={errors.testDate}
        />
      )}
    </div>
  );
}
