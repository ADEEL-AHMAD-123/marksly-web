'use client';

import { useRef, useState } from 'react';
import { X, Upload, Download, FileSpreadsheet } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

export interface ImportResultRow {
  row: number;
  status: 'created' | 'error';
  name?: string;
  message?: string;
  email?: string;
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
  /** Shown under the file picker before an import runs — not hardcoded
   *  since the wording differs per caller (e.g. students vs. staff-type
   *  roles). Omit for no help text. */
  helpText?: string;
  /** Shown at the top of the results screen after a successful import —
   *  e.g. students have no per-row credential display here (no email/phone
   *  to show), so this points the admin at the Class Roster page instead. */
  resultNote?: React.ReactNode;
}

export function ImportCsvDrawer({ open, onClose, title, columns, sample, filename, onImport, helpText, resultNote }: Props) {
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

                {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
              </>
            )}

            {result && (
              <div className="space-y-4">
                {resultNote && (
                  <div className="rounded-lg border border-primary/30 bg-primary-soft/40 px-3.5 py-2.5 text-xs text-foreground">
                    {resultNote}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-border bg-muted/40 p-3 text-center">
                    <p className="text-xl font-semibold text-foreground">{result.created}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </div>
                  <div className={cn('rounded-xl border p-3 text-center', result.failed > 0 ? 'border-danger/30 bg-danger-soft' : 'border-border bg-muted/40')}>
                    <p className={cn('text-xl font-semibold', result.failed > 0 ? 'text-danger' : 'text-foreground')}>{result.failed}</p>
                    <p className="text-xs text-muted-foreground">Row errors</p>
                  </div>
                </div>

                {createdRows.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-foreground">
                      {createdRows.length} account{createdRows.length === 1 ? '' : 's'} created
                    </p>
                    <div className="relative">
                      <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
                        {createdRows.map((r, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted">
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{r.name}</p>
                              {r.email && <p className="truncate text-muted-foreground" dir="ltr">{r.email}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Fade cue at the bottom edge — hints there's more to
                          scroll to on a large import without needing to
                          trial-and-error scroll to find out. Only shows once
                          the list is actually tall enough to clip (7+ rows
                          at this row height within max-h-64). */}
                      {createdRows.length > 7 && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 rounded-b-lg bg-gradient-to-t from-card to-transparent" />
                      )}
                    </div>
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
