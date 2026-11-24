const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" });

/** "Today, 6:10 pm", "Yesterday, 9:05 am", "21 Nov, 4:30 pm" (India time). */
export function when(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const day = (x: Date) => dateFmt.format(x);
  const now = new Date();
  const label = day(d) === day(now) ? "Today" : day(d) === day(new Date(now.getTime() - 864e5)) ? "Yesterday" : day(d);
  return `${label}, ${timeFmt.format(d).toLowerCase()}`;
}

/** Morning / afternoon / evening greeting in India time. */
export function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
