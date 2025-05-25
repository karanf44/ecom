"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import GlobalErrorDisplay from "@/components/error/GlobalErrorDisplay";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <GlobalErrorDisplay onRetry={reset} />
      </body>
    </html>
  );
}