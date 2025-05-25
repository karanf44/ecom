// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 1.0,
    debug: process.env.NODE_ENV === 'development',
    // profilesSampleRate: 1.0, // Uncomment if you want profiling
  });
  console.log("Sentry server initialized (Plug-and-Play)");
} else {
  if (process.env.NODE_ENV === 'development') {
    console.log("Sentry server is DISABLED via NEXT_PUBLIC_SENTRY_ENABLED.");
  }
}
