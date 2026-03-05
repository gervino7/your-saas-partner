import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[100px] w-full rounded-lg border-2 border-border/40 bg-white dark:bg-card px-3.5 py-3 text-sm transition-all duration-200 ring-offset-background placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/10 focus-visible:border-primary focus-visible:bg-background disabled:cursor-not-allowed disabled:opacity-50 hover:border-primary/40 resize-y",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
