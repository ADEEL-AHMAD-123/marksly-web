'use client';

import { type LucideIcon } from 'lucide-react';
import { QRCode } from '@/components/ui/qr-code';
import { CARD_WIDTH_MM, CARD_HEIGHT_MM } from '@/components/shared/idCardPrint';
import { IdCardCredit } from '@/components/shared/IdCardCredit';
import { cn } from '@/lib/utils';

export interface IdCardBackRow {
  icon: LucideIcon;
  label: string;
  value: string;
}

/**
 * Shared back face for every printable ID card (student + staff/self-
 * service) — real physical ID cards almost always carry a second side, and
 * this app's cards previously had none at all, cramming every secondary
 * detail (phone, address, blood group, parent info) onto the front instead.
 * Splitting that content onto a proper back gives the front room to breathe
 * and matches what an actual card looks like: a clean front for
 * identification at a glance, a denser back for the details someone only
 * reads when they need to.
 */
export function IdCardBack({
  institution,
  rows,
  validityLabel,
  qrValue,
  accentClassName,
  officeLabel = 'institution office',
}: {
  institution: { name: string; city?: string | null };
  rows: IdCardBackRow[];
  validityLabel?: string | null;
  qrValue: string;
  accentClassName?: string;
  /** e.g. "school office" / "campus office" — terminology-aware wording
   *  for where a found card should be returned. Defaults to a generic,
   *  institution-type-neutral phrase so a college/university doesn't get
   *  a hardcoded "school office" it has no such thing as. */
  officeLabel?: string;
}) {
  return (
    <div
      className={cn('id-card mx-auto flex w-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm', accentClassName ?? 'border-border')}
      style={{ aspectRatio: `${CARD_WIDTH_MM} / ${CARD_HEIGHT_MM}`, maxWidth: 380 }}
    >
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-1.5">
        <p className="truncate text-[9.5px] font-semibold text-foreground">{institution.name}</p>
        <p className="shrink-0 text-[8px] font-medium uppercase tracking-wide text-muted-foreground">Back</p>
      </div>

      <div className="flex flex-1 gap-3 p-3">
        <div className="flex flex-1 flex-col gap-1.5 overflow-hidden">
          <dl className="flex flex-col gap-1.5 text-[10.5px] leading-tight">
            {rows.map((r) => (
              <div key={r.label} className="flex items-start gap-1.5">
                <r.icon size={10} className="mt-[1px] shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <dt className="text-[8px] font-medium uppercase tracking-wide text-muted-foreground">{r.label}</dt>
                  <dd className="truncate font-semibold text-foreground">{r.value}</dd>
                </div>
              </div>
            ))}
          </dl>

          {/* Validity shown once, here — previously repeated a second time
              just above the signature line with no new information, which
              read as a mistake rather than emphasis. */}
          {validityLabel && (
            <p className="mt-0.5 text-[9px] font-semibold text-foreground/90">Valid until: {validityLabel}</p>
          )}

          <div className="mt-auto flex flex-col gap-1.5 border-t border-border pt-1.5">
            <p className="text-[8px] leading-tight text-muted-foreground">
              If this card is found, please return it to the {officeLabel}{institution.city ? ` (${institution.name}, ${institution.city})` : ` (${institution.name})`}.
            </p>
            {/* A conventional signature block — the line sits above its own
                label instead of a thin rule with tiny text crammed beside
                it, so it actually reads as "sign here" at a glance. */}
            <div className="flex flex-col gap-0.5">
              <div className="h-5 w-full border-b border-dashed border-foreground/40" />
              <p className="text-[7.5px] font-medium text-muted-foreground">Authorized signature</p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center gap-1.5 border-l border-border pl-3">
          <QRCode value={qrValue} size={60} />
          <p className="text-center text-[7.5px] font-medium leading-tight text-foreground/70">Scan to verify</p>
          {/* Generic per product-owner correction — not "Principal's stamp",
              since not every institution type has a principal. */}
          <div className="mt-auto flex h-10 w-full items-center justify-center rounded border border-dashed border-border">
            <p className="text-center text-[7px] leading-tight text-muted-foreground">Official stamp</p>
          </div>
        </div>
      </div>

      <div className="border-t border-border py-0.5">
        <IdCardCredit />
      </div>
    </div>
  );
}
