"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProgressProvider } from "@bprogress/next/app";
import { ProgressBar } from "./progress-bar";
import { ReactNode } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ProgressProvider
      options={{
        template: null,
      }}
    >
      <ProgressBar />
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ProgressProvider>
  );
}
