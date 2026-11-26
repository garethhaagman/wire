import type { LabelHTMLAttributes } from "react";
import { forwardRef } from "react";
import { cn } from "./cn.js";

export const Label = forwardRef<
  HTMLLabelElement,
  LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  // biome-ignore lint/a11y/noLabelWithoutControl: generic wrapper — htmlFor/children come from {...props} at the call site
  <label
    className={cn(
      "text-foreground text-sm leading-none font-medium",
      className
    )}
    ref={ref}
    {...props}
  />
));
Label.displayName = "Label";
