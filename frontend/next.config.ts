import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing Next.js config options here, e.g.:
  // reactStrictMode: true,
};

const sentryOptions = {
  // Sentry Webpack plugin options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Auth token is read from SENTRY_AUTH_TOKEN environment variable
  
  // Only print logs for uploading source maps if SENTRY_PLUGIN_VERBOSE is true, otherwise silent in CI
  silent: !(process.env.SENTRY_PLUGIN_VERBOSE === 'true' || !process.env.CI),
  
  widenClientFileUpload: true,
  disableLogger: true, 
  disableSOURCEMAPUnderscoreMonikerWarning: true, 
  automaticVercelMonitors: true,
  // tunnelRoute: "/monitoring", // Uncomment to enable tunneling, if needed
};

let exportableConfig = nextConfig;

if (process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true') {
  if (process.env.NODE_ENV === 'development') {
    console.log("Sentry: Build-time processing is ENABLED.");
  }
  // Ensure SENTRY_ORG and SENTRY_PROJECT are set for the Sentry Webpack plugin to work.
  if (!process.env.SENTRY_ORG || !process.env.SENTRY_PROJECT) {
    console.warn(
      "Sentry: SENTRY_ORG or SENTRY_PROJECT not set. Source map uploads and some features will be disabled."
    );
    // Optionally, don't wrap with Sentry config if essential vars are missing, 
    // or let Sentry handle the warning internally.
  }
  exportableConfig = withSentryConfig(exportableConfig, sentryOptions);
} else {
  if (process.env.NODE_ENV === 'development') {
    console.log("Sentry: Build-time processing is DISABLED via NEXT_PUBLIC_SENTRY_ENABLED.");
  }
}

export default exportableConfig;