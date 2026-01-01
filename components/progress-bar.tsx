"use client";

import { Progress, Bar } from "@bprogress/next";

export function ProgressBar() {
  return (
    <Progress>
      <Bar className="fixed top-16 left-0 right-0 h-1 bg-gradient-to-r from-primary to-blue-500 z-[9999]" />
    </Progress>
  );
}
