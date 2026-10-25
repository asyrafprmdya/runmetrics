"use client";

import { useState } from "react";
import type { ParseResult } from "@/lib/validation";
import { TextField } from "./fields";

interface LiveFieldProps {
  id: string;
  label: string;
  value: number | null;
  format: (value: number) => string;
  parse: (raw: string) => ParseResult<number>;
  onCommit: (value: number | null) => void;
  onInvalid?: () => void;
  optional?: boolean;
  suffix?: string;
  hint?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal";
}

export function LiveField({
  id,
  label,
  value,
  format,
  parse,
  onCommit,
  onInvalid,
  optional = false,
  suffix,
  hint,
  placeholder,
  inputMode = "text",
}: LiveFieldProps) {
  const [draft, setDraft] = useState(value === null ? "" : format(value));
  const [error, setError] = useState<string | null>(null);

  function handleChange(raw: string): void {
    setDraft(raw);
    if (raw.trim() === "") {
      setError(null);
      if (optional) onCommit(null);
      else onInvalid?.();
      return;
    }
    const parsed = parse(raw);
    if (parsed.ok) {
      setError(null);
      onCommit(parsed.value);
    } else {
      onInvalid?.();
    }
  }

  function handleBlur(): void {
    if (draft.trim() === "" && optional) {
      setError(null);
      return;
    }
    const parsed = parse(draft);
    setError(parsed.ok ? null : parsed.error);
  }

  return (
    <TextField
      id={id}
      label={label}
      value={draft}
      onChange={handleChange}
      onBlur={handleBlur}
      error={error}
      hint={hint}
      suffix={suffix}
      placeholder={placeholder}
      inputMode={inputMode}
    />
  );
}
