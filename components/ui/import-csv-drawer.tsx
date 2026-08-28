'use client';

import { useRef, useState } from 'react';
import { X, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Mail, MailWarning, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { EmailDeliveryStatus } from '@/store/api/usersApi';

export interface ImportResultRow {
  row: number;
  status: string;
  name?: string;
  message?: string;
  email?: string;
  emailDeliveryStatus?: EmailDeliveryStatus;
  emailDeliveryError?: string;
}

export interface ImportResult {
  created: number;
  total: number;
  failed: number;
  results: ImportResultRow[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Column headers the CSV should contain (first ones required). */
  columns: string[];
  /** A sample data row (same length as columns) for the template. */
  sample: string[];
  filename: string;
  onImport: (csv: string) => Promise<ImportResult>;
}

/** Small per-row indicator for a created account's invite email — same
 *  information as InviteStatusBadge (used in the Teachers/Staff tables)
 *  but compact enough for a dense results list, since bulk imports can
 *  produce dozens of rows here at once. */
function InviteResultBadge({ status, error }: { status?: EmailDeliveryStatus; error?: string }) {
  if (status === 'bounced' || status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-danger" title={error || undefined}>
        <MailWarning size={12} /> Invite failed
      </span>
    );
  }
  if (status === 'delivered') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
        <CheckCircle2 size={12} /> Delivered
      </span>
    );
  }
  if (status === 'sent') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <Mail size={12} /> Invited
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
      <Clock size={12} /> Sending…
    </span>
  );
}

export function ImportCsvDrawer({ open, onClose, title, columns, sample, filename, onImport }: Props) {
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setCsv(''); setFileName(''); setResult(null); };

  const downloadTemplate = () => {
    const content = `${columns.join(',')}\n${sample.join(',')}\n`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setCsv(await file.text());
  };

  const runImport = async () => {
    if (!csv.trim()) { toast.error('Choose a CSV file first'); return; }
    setBusy(true);
    try {
      const res = await onImport(csv);
      setResult(res);
      if (res.created > 0) toast.success(`${res.created} of ${res.total} imported`);
      else toast.error('Nothing imported — check the errors');
    } catch (e: any) {
      toast.error(e?.data?.error?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const errorRows = result?.results.filter((r) => r.status === 'error') ?? [];
  const createdRows = result?.results.filter((r) => r.status === 'created') ?? [];
  const failedInvites = createdRows.filter((r) => r.emailDeliveryStatus === 'failed' || r.emailDeliveryStatus === 'bounced').length;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <SheetContent side="right" hideClose className="w-full bg-card text-card-foreground sm:w-[480px]">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <SheetClose className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={18} /></SheetClose>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {!result && (
              <>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-sm font-medium text-foreground">Required columns</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {columns.map((c) => (
                      <span key={c} className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{c}</span>
                    ))}
                  </div>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={downloadTemplate}>
                    <Download size={15} /> Download template
                  </Button>
                </div>

                <div>
                  <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border px-4 py-8 text-center transition-colors hover:border-primary hover:bg-primary-soft/40"
                  >
                    <FileSpreadsheet size={26} className="text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{fileName || 'Choose a CSV file'}</span>
                    <span className="text-xs text-muted-foreground">Click to browse</span>
                  </button>
                </div>

                <p className="text-xs text-muted-foreground">
                  Each row gets an activation link emailed to it, same as adding one person at a time — nobody gets a password chosen for them.
                </p>
              </>
            )}

            {result && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
                    <p className="text-xl font-semibold text-foreground">{result.created}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </div>
                  <div className={cn('rounded-xl border p-3 text-center', result.failed > 0 ? 'border-danger/30 bg-danger-soft' : 'border-border bg-muted/40')}>
                    <p className={cn('text-xl font-semibold', result.failed > 0 ? 'text-danger' : 'text-foreground')}>{result.failed}</p>
                    <p className="text-xs text-muted-foreground">Row errors</p>
                  </div>
                  <div className={cn('rounded-xl border p-3 text-center', failedInvites > 0 ? 'border-warning/30 bg-warning-soft' : 'border-border bg-muted/40')}>
                    <p className={cn('text-xl font-semibold', failedInvites > 0 ? 'text-warning' : 'text-foreground')}>{failedInvites}</p>
                    <p className="text-xs text-muted-foreground">Invites failed</p>
                  </div>
                </div>

                {createdRows.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-foreground">
                      {createdRows.length} account{createdRows.length === 1 ? '' : 's'} created
                    </p>
                    <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                      {createdRows.map((r, i) => (
                        <div key={i} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{r.name}</p>
                            {r.email && <p className="truncate text-muted-foreground" dir="ltr">{r.email}</p>}
                            {r.emailDeliveryError && <p className="mt-0.5 text-danger">{r.emailDeliveryError}</p>}
                          </div>
                          <div className="shrink-0">
                            <InviteResultBadge status={r.emailDeliveryStatus} error={r.emailDeliveryError} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {failedInvites > 0 && (
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        Accounts with a failed invite were still created — use &quot;Resend invite&quot; for them from the list after closing this.
                      </p>
                    )}
                  </div>
                )}

                {errorRows.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-foreground">
                      {errorRows.length} row{errorRows.length === 1 ? '' : 's'} couldn&apos;t be imported — row numbers match your spreadsheet (including the header row):
                    </p>
                    <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                      {errorRows.map((e, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <Badge variant="danger" className="mt-0.5 shrink-0">Row {e.row}</Badge>
                          <span className="text-foreground">{e.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="secondary" size="sm" onClick={reset}>
                  <Upload size={14} /> Import another file
                </Button>
              </div>
            )}
          </div>

          {!result && (
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <SheetClose asChild><Button type="button" variant="secondary">Cancel</Button></SheetClose>
              <Button onClick={runImport} loading={busy} disabled={!csv.trim()}>
                <Upload size={16} /> Import
              </Button>
            </div>
          )}
          {result && (
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <SheetClose asChild><Button type="button">Done</Button></SheetClose>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
