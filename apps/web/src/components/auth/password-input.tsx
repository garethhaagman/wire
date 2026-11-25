import { Eye, EyeOff } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { forwardRef, useState } from "react";
import { Input } from "@/components/ui/input.js";
import { cn } from "@/lib/cn.js";

export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "type">
>(({ className, ...props }, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        className={cn("pr-10", className)}
        ref={ref}
        type={visible ? "text" : "password"}
        {...props}
      />
      <button
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        onClick={() => setVisible((v) => !v)}
        type="button"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";
