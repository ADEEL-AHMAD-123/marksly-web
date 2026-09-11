'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm data-[state=open]:animate-fade-in',
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = 'SheetOverlay';

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: 'left' | 'right';
  /** Hide the default close button (caller renders its own). */
  hideClose?: boolean;
}

// A Select/DropdownMenu/Popover inside the drawer renders its open content
// into a portal on document.body — outside the drawer's own DOM subtree.
// Radix Dialog's default "click outside closes" behavior sees that click as
// outside the drawer and closes it (silently discarding whatever the admin
// had typed into the form so far), even though the admin was still
// interacting with a control that's visually INSIDE the drawer. Every such
// popup content renders through a `[data-radix-popper-content-wrapper]`
// (Select/DropdownMenu/Popover all share this Radix Popper primitive), so
// ignoring outside-clicks that land there fixes the drawer-closing bug for
// all of them at once, in this one shared place, rather than patching each
// form separately.
// Exported so any other Radix Dialog.Content usage in the app (raw dialogs
// that don't go through this Sheet wrapper, e.g. StudentsView.tsx's "Class
// logins" dialog, EditCardDetailsDialog.tsx) can apply the same guard on
// their own onPointerDownOutside/onInteractOutside handlers.
export const isInsideRadixPopper = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest('[data-radix-popper-content-wrapper]');

// A SECOND, more severe issue than the click-detection one above: while a
// Select's dropdown is open, Radix Select (this app's @radix-ui/react-select
// version has no `modal={false}` escape hatch) unconditionally sets
// `document.body.style.pointerEvents = 'none'` and, since that's inherited,
// every other element on the page — including THIS drawer's own content and
// every field inside it — silently stops receiving clicks at all. A click on
// any other field in the form then falls through to whatever's behind it
// (the dialog's own overlay), which reads as "clicked the overlay, close the
// drawer" and discards whatever was typed. `!pointer-events-auto` below
// forces this drawer's content back to clickable regardless of that
// body-wide lockout, so the rest of the form keeps working normally while a
// dropdown elsewhere in it is open.
// Exported for the same reason as isInsideRadixPopper above — any other
// raw Dialog.Content that has a Select inside it needs this too.
export const POINTER_EVENTS_OVERRIDE = '!pointer-events-auto';

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, children, side = 'left', hideClose, onPointerDownOutside, onInteractOutside, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex h-full w-72 max-w-[85vw] flex-col shadow-lg transition-transform',
        side === 'left' ? 'left-0 top-0' : 'right-0 top-0',
        'data-[state=open]:animate-fade-in',
        POINTER_EVENTS_OVERRIDE,
        className
      )}
      onPointerDownOutside={(e) => {
        if (isInsideRadixPopper(e.target)) { e.preventDefault(); return; }
        onPointerDownOutside?.(e);
      }}
      onInteractOutside={(e) => {
        if (isInsideRadixPopper(e.target)) { e.preventDefault(); return; }
        onInteractOutside?.(e);
      }}
      {...props}
    >
      {children}
      {!hideClose && (
        <DialogPrimitive.Close className="absolute right-3 top-3 rounded-md p-1 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X size={18} />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = 'SheetContent';

export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;
