import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "shrink-0 border-b border-border bg-card px-6 pt-6 pb-4 space-y-1 text-left",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "shrink-0 border-t border-border bg-muted/30 px-6 py-4 flex flex-row items-center justify-end gap-2",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

/**
 * Le contenu de dialogue est structuré automatiquement :
 * en-tête et pied fixes, corps défilant (`overflow-y-auto`).
 * Passez `unwrapped` pour gérer la mise en page vous-même.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    unwrapped?: boolean;
    bodyClassName?: string;
  }
>(({ className, children, unwrapped, bodyClassName, ...props }, ref) => {
  const items = React.Children.toArray(children);
  const isSlot = (node: React.ReactNode, slot: unknown) =>
    React.isValidElement(node) && node.type === slot;

  const header = items.filter((c) => isSlot(c, DialogHeader));
  const footer = items.filter((c) => isSlot(c, DialogFooter));
  const body = items.filter((c) => !isSlot(c, DialogHeader) && !isSlot(c, DialogFooter));

  return (
    <DialogPortal>
      <DialogOverlay />
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 pointer-events-none">
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "relative pointer-events-auto flex flex-col w-full max-w-lg overflow-hidden border border-border bg-card shadow-sm duration-200",
            "max-h-[92vh] h-full rounded-none sm:h-auto sm:max-h-[85vh] sm:rounded-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=open]:slide-in-from-bottom-4 sm:data-[state=open]:slide-in-from-bottom-0",
            className,
          )}
          {...props}
        >
          {unwrapped ? (
            children
          ) : (
            <>
              {header}
              <div
                className={cn(
                  "flex-1 overflow-y-auto",
                  /\bp-0\b/.test(className ?? "") ? "" : "px-6 py-5 space-y-5",
                  bodyClassName,
                )}
              >
                {body}
              </div>
              {footer}
            </>
          )}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground ring-offset-background transition-colors hover:text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10">
            <X className="h-4 w-4" />
            <span className="sr-only">Fermer</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </div>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-tight tracking-tight text-foreground pr-8", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
