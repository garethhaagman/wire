import { QueryClientProvider } from "@tanstack/react-query";
import { baseUiConfig } from "@wire/ui-config";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.js";
import { queryClient } from "./lib/query-client.js";
import { applyTheme } from "./lib/ui-config/apply-theme.js";
import "./styles/globals.css";

const container = document.querySelector("#root");
if (!container) {
  throw new Error("#root element not found");
}

// Routes outside a workspace (home, login, workspace list) have no
// UiConfigProvider, so they'd otherwise render with every color token unset.
applyTheme(baseUiConfig);

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
