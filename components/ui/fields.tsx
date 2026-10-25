import { Check, CircleAlert } from "lucide-react";
import type { HTMLInputTypeAttribute, ReactNode } from "react";

const INPUT_BASE =
  "h-11 w-full rounded-lg border bg-bg px-3 text-sm text-ink tabular-nums placeholder:text-muted/70 disabled:cursor-not-allowed disabled:opacity-50";

function borderFor(error: string | null | undefined): string {
  return error ? "border-bad" : "border-line focus:border-accent";
}

export function FieldError({ id, error }: { id: string; error?: string | null }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs text-bad">
      <CircleAlert size={14} className="mt-px shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </p>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string | null;
  hint?: string;
  suffix?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal";
  type?: HTMLInputTypeAttribute;
  disabled?: boolean;
  maxLength?: number;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
  suffix,
  placeholder,
  inputMode = "text",
  type = "text",
  disabled,
  maxLength,
}: TextFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          inputMode={inputMode}
          disabled={disabled}
          maxLength={maxLength}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${INPUT_BASE} ${borderFor(error)} ${suffix ? "pr-14" : ""}`}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">
            {suffix}
          </span>
        )}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      <FieldError id={errorId} error={error} />
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  hint?: string;
  disabled?: boolean;
}

export function SelectField({ id, label, value, options, onChange, hint, disabled }: SelectFieldProps) {
  const hintId = `${id}-hint`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-describedby={hint ? hintId : undefined}
        className={`${INPUT_BASE} border-line focus:border-accent`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

interface SegmentedControlProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: ReactNode;
  columns?: number;
}

export function SegmentedControl<T extends string | number>({
  label,
  value,
  options,
  onChange,
  hint,
  columns,
}: SegmentedControlProps<T>) {
  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-medium text-ink">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={`flex h-11 items-center justify-center gap-1.5 rounded-lg border px-2 text-sm transition-colors duration-150 ${
                active
                  ? "border-accent bg-elevated font-medium text-accent"
                  : "border-line bg-bg text-muted hover:text-ink"
              }`}
            >
              {active && <Check size={14} aria-hidden="true" />}
              {option.label}
            </button>
          );
        })}
      </div>
      {hint && <div className="mt-1.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

interface ToggleFieldProps {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ToggleField({ id, label, description, checked, onChange }: ToggleFieldProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-bg p-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
      />
      <span>
        <span className="block text-[13px] font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
    </label>
  );
}
