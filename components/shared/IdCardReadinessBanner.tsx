'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertTriangle, ImageOff, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhotoUpload } from '@/components/shared/PhotoUpload';

export interface ReadinessPerson {
  /** The record's own id — used only as the React key. */
  id: string;
  /** The underlying User id the photo endpoints are keyed on. Null means
   *  there's genuinely nothing we can upload against (shouldn't normally
   *  happen, but keeps this defensive). */
  userId: string | null;
  name: string;
  profilePhoto: string | null;
  /** Small secondary line under the name — class/section for students,
   *  role for staff. */
  context?: string | null;
}

interface IdCardReadinessBannerProps {
  people: ReadinessPerson[];
  /** e.g. "student" / "staff member" — used for pluralized copy. */
  personLabel: string;
  /** Institution logo URL from the sheet — when missing, shows a separate,
   *  lower-priority note. */
  institutionLogoUrl?: string | null;
}

/** Sits above the printable card grid (inside the caller's `no-print`
 *  region) and proactively calls out people missing a profile photo, plus a
 *  lower-priority note when the institution logo itself hasn't been set —
 *  both fixable without leaving the page. The missing-photo count derives
 *  live from `people`, so it naturally shrinks as uploads succeed via RTK
 *  Query's existing cache invalidation — no manual refresh wiring needed. */
export function IdCardReadinessBanner({ people, personLabel, institutionLogoUrl }: IdCardReadinessBannerProps) {
  const [open, setOpen] = useState(false);
  const missing = useMemo(() => people.filter((p) => !p.profilePhoto), [people]);
  const logoMissing = institutionLogoUrl === null;

  if (missing.length === 0 && !logoMissing) return null;

  const plural = missing.length === 1 ? personLabel : `${personLabel}s`;

  return (
    <>
      {missing.length > 0 && (
        <Card className="flex flex-col gap-3 border-warning/40 bg-warning-soft p-4 no-print sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
              <ImageOff size={16} />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {missing.length} {plural} {missing.length === 1 ? 'is' : 'are'} missing a profile photo
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Cards will show initials instead, which is easier to fake — add photos before printing.
              </p>
            </div>
          </div>
          <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setOpen(true)}>
            Review &amp; add photos
          </Button>
        </Card>
      )}

      {logoMissing && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground no-print">
          <AlertTriangle size={13} className="shrink-0 text-muted-foreground" />
          Your institution logo hasn&apos;t been uploaded yet — cards currently show a generic icon.{' '}
          <Link href="/admin/settings" className="font-medium text-primary underline underline-offset-2">
            Add a logo in Settings
          </Link>
        </p>
      )}

      <MissingPhotosDialog open={open} onOpenChange={setOpen} people={missing} personLabel={personLabel} />
    </>
  );
}

function MissingPhotosDialog({
  open, onOpenChange, people, personLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: ReadinessPerson[];
  personLabel: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-border p-5 pb-4">
            <div>
              <DialogPrimitive.Title className="text-base font-semibold">Missing profile photos</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-0.5 text-sm text-muted-foreground">
                Add a photo for each {personLabel} below — this list updates automatically as you go.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <X size={16} />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {people.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">All caught up — every {personLabel} has a photo.</p>
            ) : (
              people.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                    {p.context && <p className="truncate text-xs text-muted-foreground">{p.context}</p>}
                  </div>
                  {p.userId ? (
                    <PhotoUpload
                      userId={p.userId}
                      photoUrl={p.profilePhoto}
                      initials={p.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      size="md"
                      className="shrink-0 flex-row-reverse"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">No linked account</span>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
