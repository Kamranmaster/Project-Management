import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { toast, Toaster } from "sonner";
import { App } from "./App";
import { resetSession } from "./hooks/useAuth";
import { setSessionExpiredHandler } from "./lib/http";
import { queryClient, queryKeys } from "./lib/queryClient";
import "./index.css";

// When a silent refresh fails, end the local session. ProtectedRoute then
// redirects to /login, remembering the page the user was on.
setSessionExpiredHandler(() => {
  const wasSignedIn = !!queryClient.getQueryData(queryKeys.me);
  resetSession(queryClient, null);
  if (wasSignedIn) {
    toast.error("Your session has expired", { description: "Please sign in again." });
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* Bottom-right so toasts never cover the topbar or the task drawer's header actions */}
      <Toaster position="bottom-right" richColors closeButton />
    </QueryClientProvider>
  </StrictMode>,
);
