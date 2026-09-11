/** Einheitliche Auswertung von Server-Action-Ergebnissen im Client. */
export type ActionFailure = { error: string; reasons?: string[]; missing?: unknown };

export function isFailure<T extends object>(result: T | ActionFailure): result is ActionFailure {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof (result as ActionFailure).error === "string"
  );
}

export function errorOf<T extends object>(result: T | ActionFailure): string | null {
  return isFailure(result) ? result.error : null;
}
