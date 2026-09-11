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
const isInsideRadixPopper = (target: EventTarget | null) =>
  target instanceof Element && !!target.closest('[data-radix-popper-content-wrapper]');

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
