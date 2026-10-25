export type FormState = {
  error?: string;
  success?: string;
  // Echoed back so fields keep their values after a failed submit.
  values?: Record<string, string>;
} | null;

export function formValues(formData: FormData, omit: string[] = []) {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !omit.includes(key) && !key.startsWith("$")) {
      values[key] = value;
    }
  }
  return values;
}
