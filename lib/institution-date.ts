// Institution-timezone ("today") helpers, centralized so the offset only
// needs to change in one place if multi-timezone institutions are ever
// supported. Mirrors the backend's karachiTodayStr() (attendance.helpers.ts
// in marksly-api), which is what actually decides FUTURE_DATE server-side —
// a plain `new Date().toISOString()` would read as tomorrow's date for part
// of the Karachi evening (UTC 19:00–23:59 = Karachi 00:00–04:59 next day),
// wrongly capping a date picker's `max` a day behind the real current day
// in Karachi during that window.
export const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000;

export const todayStr = () => new Date(Date.now() + KARACHI_OFFSET_MS).toISOString().slice(0, 10);

// dayOfWeek (0=Sunday..6=Saturday) for "right now," in institution-timezone
// terms — mirrors the backend's timetable.service.ts#teacherNow(), which
// computes "today"/"current period" the same Karachi-wall-clock way rather
// than trusting the server's (UTC) or the viewer's browser's local day.
// Anything highlighting "today" in a weekly grid should use this instead of
// `new Date().getDay()`, which reads the viewer's own timezone and can
// disagree with what the backend (and other components) call today.
export const todayDayOfWeek = () => new Date(Date.now() + KARACHI_OFFSET_MS).getUTCDay();
