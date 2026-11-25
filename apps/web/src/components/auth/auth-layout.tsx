import { baseUiConfig } from "@wire/ui-config";
import type { ReactNode } from "react";
import { AuthShader } from "./auth-shader.js";

function BrandMark(): React.JSX.Element {
  const { productName, logo } = baseUiConfig.branding;

  if (logo.full) {
    return (
      // biome-ignore lint/correctness/useImageSize: org-provided logo of unknown aspect ratio; h-6 w-auto preserves it, a fixed width would distort it
      <img alt={productName} className="h-6 w-auto" src={logo.full} />
    );
  }

  return (
    <div className="text-foreground flex items-center gap-2.5">
      <span className="border-border bg-card text-foreground flex h-7 w-7 items-center justify-center rounded-md border shadow-sm">
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.4"
          viewBox="0 0 24 24"
        >
          <path d="M3 8h5c4 0 4 8 8 8h5" />
          <path d="M3 16h5c1.6 0 2.5-1.3 3.3-2.8M12.7 10.8C13.5 9.3 14.4 8 16 8h5" />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight">
        {productName.toLowerCase()}
      </span>
    </div>
  );
}

/**
 * Full-bleed auth screen: form column on the left, shader panel on the right (hidden below lg).
 * Renders against the base config — no org is known until after sign-in.
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
