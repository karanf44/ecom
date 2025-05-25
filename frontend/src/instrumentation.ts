import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      if (process.env.NODE_ENV === 'development') {
        console.log("Sentry: Attempting to initialize for Node.js runtime...");
      }
      await import('../sentry.server.config');
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
      if (process.env.NODE_ENV === 'development') {
        console.log("Sentry: Attempting to initialize for Edge runtime...");
      }
      await import('../sentry.edge.config');
    }
  } else {
    if (process.env.NODE_ENV === 'development' && 
        (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge')) {
      console.log("Sentry server/edge instrumentation is DISABLED via NEXT_PUBLIC_SENTRY_ENABLED.");
    }
  }
}

// Conditionally export captureRequestError
let captureRequestErrorFn;
if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
    captureRequestErrorFn = Sentry.captureRequestError;
} else {
    // Provide a no-op function if Sentry is disabled
    captureRequestErrorFn = () => Promise.resolve();
}
export const onRequestError = captureRequestErrorFn;
