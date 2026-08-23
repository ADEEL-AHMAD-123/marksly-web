import { Check, MessageCircle, QrCode } from 'lucide-react';

export type VisualKind =
  | 'attendance' | 'exams' | 'timetable' | 'fees'
  | 'students' | 'messaging' | 'idcard' | 'reports';

/**
 * Abstract, branded illustrative panels — deliberately NOT screenshots of
 * the real app UI (we don't have real product screenshots to use, and a
 * fabricated one would misrepresent the product). Each panel uses the same
 * "window chrome" frame for a consistent, premium documentation feel, with
 * content built from simple shapes rather than literal interface mockups.
 */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-md">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/40" />
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function Row({ label, sub, status }: { label: string; sub: string; status: 'success' | 'danger' | 'muted' }) {
  const dot = status === 'success' ? 'bg-success' : status === 'danger' ? 'bg-danger' : 'bg-muted-foreground/40';
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
    </div>
  );
}

export function FeatureVisual({ kind }: { kind: VisualKind }) {
  switch (kind) {
    case 'attendance':
      return (
        <Frame>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Class 8 — Section A</p>
          <div className="mt-3 space-y-2">
            <Row label="Ahmed Raza" sub="Present" status="success" />
            <Row label="Sana Tariq" sub="Present" status="success" />
            <Row label="Bilal Hussain" sub="Absent" status="danger" />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">
            Attendance rate <span>92%</span>
          </div>
        </Frame>
      );

    case 'exams':
      return (
        <Frame>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mid-Term — Mathematics</p>
          <div className="mt-3 space-y-2.5">
            {[
              { name: 'Ahmed Raza', pct: 88 },
              { name: 'Sana Tariq', pct: 95 },
              { name: 'Bilal Hussain', pct: 71 },
            ].map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{s.pct}%</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-accent" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Frame>
      );

    case 'timetable':
      return (
        <Frame>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Monday — Section A</p>
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[10px] font-medium">
            {['9:00', '10:00', '11:00', '12:00'].map((t) => (
              <div key={t} className="text-muted-foreground">{t}</div>
            ))}
            {['Math', 'English', 'Science', 'Break'].map((s, i) => (
              <div
                key={s}
                className={`rounded-md py-2.5 ${i === 0 ? 'bg-accent text-accent-foreground' : 'bg-muted text-foreground/80'}`}
              >
                {s}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-accent">● Teaching now — Mathematics</p>
        </Frame>
      );

    case 'fees':
      return (
        <Frame>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoices — June</p>
          <div className="mt-3 space-y-2">
            <Row label="Ahmed Raza" sub="Rs 4,500 · Paid" status="success" />
            <Row label="Sana Tariq" sub="Rs 4,500 · Paid" status="success" />
            <Row label="Bilal Hussain" sub="Rs 4,500 · Due" status="danger" />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg bg-accent/10 px-3 py-2 text-xs font-semibold text-accent">
            Collected this month <span>Rs 1.2M</span>
          </div>
        </Frame>
      );

    case 'students':
      return (
        <Frame>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Students — Class 8</p>
          <div className="mt-3 space-y-2">
            {['Ahmed Raza', 'Sana Tariq', 'Bilal Hussain'].map((n) => (
              <div key={n} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {n.split(' ').map((p) => p[0]).join('')}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{n}</p>
                  <p className="text-xs text-muted-foreground">Section A · Roll 0{n.length % 9 + 1}</p>
                </div>
              </div>
            ))}
          </div>
        </Frame>
      );

    case 'messaging':
      return (
        <Frame>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sent to parents</p>
          <div className="mt-3 space-y-2.5">
            {[
              'Bilal was marked absent today.',
              'Fee reminder: Rs 4,500 due by 5th.',
              'Result for Mid-Term is now available.',
            ].map((m) => (
              <div key={m} className="flex items-start gap-2 rounded-lg bg-success-soft px-3 py-2.5 text-xs">
                <MessageCircle aria-hidden size={14} className="mt-0.5 shrink-0 text-success" />
                <span className="text-foreground/90">{m}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-success">
            <Check aria-hidden size={13} strokeWidth={3} /> All delivered
          </p>
        </Frame>
      );

    case 'idcard':
      return (
        <Frame>
          <div className="mx-auto max-w-[220px] rounded-xl border border-sidebar-border bg-sidebar p-4 text-sidebar-foreground shadow">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">Marksly ID</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="h-12 w-12 shrink-0 rounded-full bg-white/10" />
              <div>
                <p className="text-sm font-semibold">Ahmed Raza</p>
                <p className="text-[11px] text-sidebar-muted">Class 8 · Section A</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-sidebar-border pt-3">
              <p className="text-[10px] text-sidebar-muted">ID# 2026-0142</p>
              <QrCode aria-hidden size={28} className="text-white/70" />
            </div>
          </div>
        </Frame>
      );

    case 'reports':
      return (
        <Frame>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">This month</p>
          <div className="mt-3 flex items-end gap-2 h-24">
            {[40, 65, 50, 80, 60, 95, 70].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-sm bg-accent/70" style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-muted px-2 py-2">
              <p className="text-sm font-bold">92%</p>
              <p className="text-[10px] text-muted-foreground">Attendance</p>
            </div>
            <div className="rounded-lg bg-muted px-2 py-2">
              <p className="text-sm font-bold">Rs 1.2M</p>
              <p className="text-[10px] text-muted-foreground">Collected</p>
            </div>
            <div className="rounded-lg bg-muted px-2 py-2">
              <p className="text-sm font-bold">84%</p>
              <p className="text-[10px] text-muted-foreground">Avg. score</p>
            </div>
          </div>
        </Frame>
      );

    default:
      return null;
  }
}
