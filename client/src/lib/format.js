const MONTH_DAY = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

const DATE_TIME = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const toDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export function formatDate(value) {
  const date = toDate(value);
  return date ? MONTH_DAY.format(date) : "—";
}

export function formatDateTime(value) {
  const date = toDate(value);
  return date ? DATE_TIME.format(date) : "—";
}

/** "2 hours ago", "3 days ago" — falls back to a date for old values. */
export function timeAgo(value) {
  const date = toDate(value);
  if (!date) return "—";
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);

  if (abs < 60) return RELATIVE.format(Math.round(seconds), "second");
  if (abs < 3600) return RELATIVE.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return RELATIVE.format(Math.round(seconds / 3600), "hour");
  if (abs < 2592000) return RELATIVE.format(Math.round(seconds / 86400), "day");
  return formatDate(date);
}

/** ISO string -> value for <input type="datetime-local"> in local time. */
export function toLocalInput(value) {
  const date = toDate(value);
  if (!date) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function nowLocalInput() {
  return toLocalInput(new Date());
}

export function statusLabel(status) {
  if (!status) return "Unknown";
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function initials(name) {
  return String(name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function safeNext(value) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}
