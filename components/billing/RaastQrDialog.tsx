'use client';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, Smartphone } from 'lucide-react';
import { QRCode } from '@/components/ui/qr-code';
import { Button } from '@/components/ui/button';

/**
 * Raast has no hosted redirect page like card checkout — createCheckout()
 * returns an EMVCo QR payload string (see raastwire.client.ts) that we
 * render client-side, not a URL to send the payer to. The payer scans it in
 * their own banking app; we find out it's paid the same way every other
 * gateway does here — the webhook (or the status-poll fallback already
 * wired for reconciliation elsewhere on this page).
 */
export function RaastQrDialog({
  open, onClose, qrCode, amountLabel,
}: {
  open: boolean;
  onClose: () => void;
  qrCode: string | null;
  amountLabel: string;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl focus:outline-none">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogPrimitive.Title className="flex items-center gap-2 text-base font-semibold">
                <Smartphone size={16} /> Scan to pay with Raast
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                {amountLabel} — open your banking app and scan this code to pay directly from your bank account or wallet.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <X size={18} />
              </button>
            </DialogPrimitive.Close>
          </div>

          <div className="mt-5 flex flex-col items-center gap-3">
            {qrCode ? (
              <div className="rounded-xl border border-border bg-white p-3">
                <QRCode value={qrCode} size={200} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Couldn't generate a QR code — please try again.</p>
            )}
            <p className="text-center text-xs text-muted-foreground">
              This page updates automatically once your payment is confirmed. Don't close it until then.
            </p>
          </div>

          <div className="mt-5 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
