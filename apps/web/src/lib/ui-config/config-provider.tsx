import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UiConfigResource } from "@wire/types";
import type { UiConfig, UiConfigOverride } from "@wire/ui-config";
import { baseUiConfig } from "@wire/ui-config";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/api-client.js";
import { applyTheme } from "./apply-theme.js";
import { createIconRegistry, IconRegistryProvider } from "./icon-pack.js";

interface UiConfigContextValue {
  config: UiConfig;
  /** True while the first server resolve is in flight — config is the base default until then. */
  isResolving: boolean;
  setUserOverride: (override: UiConfigOverride) => void;
  warnings: string[];
}

const UiConfigContext = createContext<UiConfigContextValue | null>(null);

/**
 * Fetches the server-resolved config (base+org+user already merged, per
 * internal-docs/ui/config-schema.md "Resolution happens on the server") for
 * the active workspace and applies it. Renders children immediately against
 * `baseUiConfig` while the fetch is in flight — see
 * internal-docs/ui/theming-and-layout.md "No flash, no blank state": the
 * shell is never unstyled, it just re-themes once the real config lands.
 */
export function UiConfigProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: ReactNode;
}): React.JSX.Element {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["ui-config", workspaceId],
    queryFn: () =>
      apiFetch<UiConfigResource>(`/v1/workspaces/${workspaceId}/ui-config`),
  });

  const config = data?.resolved ?? baseUiConfig;
  const warnings = data?.warnings ?? [];

  useEffect(() => {
    applyTheme(config);
  }, [config]);

  const mutation = useMutation({
    mutationFn: (override: UiConfigOverride) =>
      apiFetch<UiConfigResource>(`/v1/workspaces/${workspaceId}/ui-config/me`, {
        method: "PATCH",
        body: JSON.stringify({ override }),
      }),
    onSuccess: (resource) => {
      queryClient.setQueryData(["ui-config", workspaceId], resource);
    },
  });

  const iconRegistry = useMemo(
    () => createIconRegistry(config.theme.iconPack),
    [config.theme.iconPack]
  );

  const value: UiConfigContextValue = {
    config,
    warnings,
    isResolving: isLoading,
    setUserOverride: (override) => mutation.mutate(override),
  };

  return (
    <UiConfigContext.Provider value={value}>
      <IconRegistryProvider value={iconRegistry}>
        {children}
      </IconRegistryProvider>
    </UiConfigContext.Provider>
  );
}

export function useUiConfig(): UiConfigContextValue {
  const ctx = useContext(UiConfigContext);
  if (!ctx) {
    throw new Error("useUiConfig must be used within UiConfigProvider");
  }
  return ctx;
}
