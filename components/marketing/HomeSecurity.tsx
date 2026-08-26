import { Database, Lock, Download, Headphones } from 'lucide-react';

export function HomeSecurity() {
  return (
    <section className="hidden bg-sidebar py-14 text-sidebar-foreground sm:block">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid grid-cols-1 divide-y divide-sidebar-border overflow-hidden rounded-2xl border border-sidebar-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {[
            { icon: Database, title: 'Data, isolated', desc: 'Never mixed across institutions' },
            { icon: Lock, title: 'Secure by default', desc: 'Encrypted, role-based access' },
            { icon: Download, title: 'Data stays yours', desc: 'Export any time, no lock-in' },
            { icon: Headphones, title: 'Direct support', desc: 'Real replies, not a ticket queue' },
          ].map((t) => (
            <div key={t.title} className="flex items-center gap-3 bg-sidebar-accent/20 px-5 py-4">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <t.icon aria-hidden size={16} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{t.title}</p>
                <p className="truncate text-xs text-sidebar-muted">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
