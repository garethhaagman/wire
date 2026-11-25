import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn.js";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground transition-[border-color,box-shadow] placeholder:text-muted-foreground hover:border-muted-foreground/40 focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/10 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
