"use client";

import { useState, type ReactNode } from "react";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ThemeProvider } from "@/lib/themes/theme-context";
import { getQueryClient } from "@/lib/query/query-client";
import { queryPersister } from "@/lib/query/persister";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => getQueryClient());

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: 1000 * 60 * 60 * 24, // 24 horas de retenção em IndexedDB
        buster: "v1",
      }}
    >
      <ThemeProvider>{children}</ThemeProvider>
    </PersistQueryClientProvider>
  );
}
