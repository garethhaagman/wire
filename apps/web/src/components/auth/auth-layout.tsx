import type { ReactNode } from "react";
import { AuthShader } from "./auth-shader.js";
import { BrandMark } from "./brand-mark.js";

/**
 * Full-bleed auth screen: form column on the left, shader panel on the right (hidden below lg).
 * Renders against the base config - no org is known until after sign-in.
 */
export function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <main className="bg-background grid min-h-dvh grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <section className="flex flex-col px-6 py-6 sm:px-12 lg:px-14 lg:py-8">
        <BrandMark />

        <div className="flex flex-1 items-center py-12">
          <div className="w-full max-w-[360px]">
            <h1 className="text-foreground text-3xl font-semibold tracking-tight">
              {title}
            </h1>
            {description ? (
              <div className="text-muted-foreground mt-2 text-sm">
                {description}
              </div>
            ) : null}
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </section>

      <div className="hidden p-5 lg:sticky lg:top-0 lg:block lg:h-dvh">
        <AuthShader className="h-full rounded-[24px]" />
      </div>
    </main>
  );
}
