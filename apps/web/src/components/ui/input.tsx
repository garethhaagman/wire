import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/cn.js";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    className={cn(
      "border-border bg-card text-foreground placeholder:text-muted-foreground hover:border-muted-foreground/40 focus-visible:border-foreground focus-visible:ring-ring/10 aria-[invalid=true]:border-destructive flex h-10 w-full rounded-md border px-3 text-sm transition-[border-color,box-shadow] focus-visible:ring-4 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    ref={ref}
    type={type}
    {...props}
  />
));
Input.displayName = "Input";
