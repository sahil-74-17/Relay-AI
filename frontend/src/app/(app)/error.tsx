"use client";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return <Card><ErrorState message={error.message || "An unexpected error occurred on this page."} onRetry={reset} /></Card>;
}
