import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/manrope";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app";
import "./styles.css";
import { queryClient } from "./lib/query-client";
import { applyTheme, getStoredTheme } from "./lib/themes";
import { ThemeProvider } from "./providers/theme-provider";

applyTheme(getStoredTheme());

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element was not found");

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
