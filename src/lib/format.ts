export const DEFAULT_COMMISSION_RATE = 0.08;

export function formatFCFA(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(Math.round(amount)).replace(/\u202f|\u00a0/g, " ")} FCFA`;
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
    .format(value)
    .replace(/\u202f|\u00a0/g, " ");
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Dakar",
  }).format(new Date(date));
}

export function formatDateLong(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Dakar",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Dakar",
  }).format(new Date(date));
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("221") && digits.length === 12) {
    return `+221 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
  }
  return phone;
}

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("221")) return `+${digits}`;
  if (digits.length === 9) return `+221${digits}`;
  return digits ? `+${digits}` : "";
}

export function isPhone(input: string): boolean {
  const digits = input.replace(/\D/g, "");
  return digits.length === 9 || (digits.startsWith("221") && digits.length === 12);
}

export const OPERATING_HOURS = "05h00 – 20h00";
