/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "virtual:wire-routes" {
  import type { ComponentType } from "react";

  export const routes: { path: string; Component: ComponentType }[];
}
