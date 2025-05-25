import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // tracesSampleRate: 1.0, // Already present in your file, ensure it's set if needed
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      // Consider adding Sentry.feedbackIntegration() if you were using it or want it
      // Sentry.feedbackIntegration({
      //   colorScheme: "system",
      // }),
    ],
    replaysSessionSampleRate: 1.0, // Your existing value
    replaysOnErrorSampleRate: 1.0, // Your existing value
    debug: process.env.NODE_ENV === 'development',
  });
  console.log("Sentry client initialized (Plug-and-Play)");
} else {
  if (process.env.NODE_ENV === 'development') {
    console.log("Sentry client is DISABLED via NEXT_PUBLIC_SENTRY_ENABLED.");
  }
}