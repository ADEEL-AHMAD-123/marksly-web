// A small, subtle "Powered by Marksly" trademark line for the bottom of
// generated ID cards — the institution's own branding (logo/name in the
// card header) stays the dominant visual element; this is intentionally
// tiny, like a website builder's "Made with X" footer badge, not a
// co-branding statement. `id-card-credit` class is targeted by
// idCardPrint.ts's print CSS so it isn't accidentally hidden on print.
export function IdCardCredit() {
  return (
    <p className="id-card-credit pointer-events-none select-none text-center text-[5.5px] font-medium uppercase tracking-wide text-muted-foreground/70">
      Powered by Marksly
    </p>
  );
}
