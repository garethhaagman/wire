import { baseUiConfig } from "@wire/ui-config";

/**
 * Product mark + wordmark from the base config. Used on pre-org surfaces
 * (login, signup, workspace picker) where no workspace theme is loaded yet.
 */
export function BrandMark(): React.JSX.Element {
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
