export class CalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalculationError";
  }
}

export function assertRange(value: number, min: number, max: number, label: string): void {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new CalculationError(`${label} harus berupa angka.`);
  }
  if (value < min || value > max) {
    throw new CalculationError(`${label} harus antara ${min} dan ${max}.`);
  }
}

export function assertPositive(value: number, label: string): void {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new CalculationError(`${label} harus lebih besar dari 0.`);
  }
}

export function tryCalc<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch (error) {
    if (error instanceof CalculationError) return null;
    throw error;
  }
}
