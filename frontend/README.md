# Frontend Setup and Deployment Guide

This guide provides instructions for setting up the frontend application locally, deploying it to AWS S3 via CloudFront using AWS CodeBuild and CodePipeline, and optionally deploying to Vercel.

## Local Development Setup

### Prerequisites

*   Node.js (version specified in `.nvmrc` or latest LTS if not specified)
*   npm or yarn (based on `package-lock.json` or `yarn.lock`)

### Steps

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd ecom/frontend
    ```

2.  **Install dependencies:**
    Based on the `package.json` and the presence of `package-lock.json`, this project uses npm.
    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Create a `.env.local` file in the `frontend` directory. Copy the contents of `.env.example` (if it exists) and update the values accordingly.
    Refer to `next.config.ts` and Sentry configuration files (`sentry.*.config.ts`) for required environment variables, especially Sentry-related ones if Sentry is enabled (`NEXT_PUBLIC_SENTRY_ENABLED=true`):
    *   `SENTRY_ORG`
    *   `SENTRY_PROJECT`
    *   `SENTRY_AUTH_TOKEN` (for source map uploads)
    *   `NEXT_PUBLIC_SENTRY_DSN`
    *   `SENTRY_DSN` (can be same as `NEXT_PUBLIC_SENTRY_DSN`)

4.  **Run the development server:**
    The `package.json` defines the following script for development:
    ```bash
    npm run dev
    ```
    This will start the Next.js development server, typically on `http://localhost:3000`. The `--turbopack` flag is used for faster development builds.

5.  **Testing:**
    To run tests:
    ```bash
    npm run test
    ```

6.  **Linting:**
    To check for linting errors:
    ```bash
    npm run lint
    ```

## Deployment to AWS S3 and CloudFront with CodePipeline & CodeBuild

This section outlines how to deploy the Next.js frontend as a static site to AWS S3, served via CloudFront, using AWS CodePipeline for continuous deployment and AWS CodeBuild for the build process.

**Note:** The current `next.config.ts` does not specify `output: 'export'`. For a static S3 deployment, the application needs to be exportable as static HTML/CSS/JS. If your application uses server-side rendering (SSR) or API routes extensively without a compatibility layer (like Lambda@Edge), a direct static export to S3 might not be suitable. You might need to adjust the build process or architecture (e.g., deploy to a service like AWS Amplify, or use a server for SSR components).

Assuming the application can be statically exported:

### 1. Modify `next.config.ts` for Static Export (if needed)

If your application is suitable for static export, modify `frontend/next.config.ts` to include the output export option:

```javascript
// frontend/next.config.ts
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Add this line
  // Your existing Next.js config options here, e.g.:
  // reactStrictMode: true,
};

// ... rest of the file (Sentry configuration)
```

### 2. Create `buildspec.yml` for AWS CodeBuild

Create a `buildspec.yml` file in the `frontend` directory:

```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 18 # Or the version your project requires
    commands:
      - cd frontend
      - echo "Installing dependencies..."
      - npm install
  build:
    commands:
      - echo "Building Next.js application..."
      - npm run build # This will use the 'next build' and 'next export' (if output: 'export' is set)
      # The output will be in the 'out' directory by default for static exports
  artifacts:
    files:
      - frontend/out/**/* # Adjust if your static export directory is different
    discard-paths: yes
    # base-directory: frontend/out # Optional: if you want paths in S3 to be relative to 'out'

cache:
  paths:
    - 'frontend/node_modules/**/*'
```

### 3. Set up S3 Bucket for Static Website Hosting

*   Create an S3 bucket (e.g., `your-frontend-app-bucket`).
*   Enable static website hosting for the bucket.
*   Set the index document to `index.html` and the error document to `404.html` (or appropriate error page).
*   Configure bucket policy to allow public read access (or restrict to CloudFront).

### 4. Set up CloudFront Distribution

*   Create a CloudFront distribution.
*   Set the **Origin Domain** to your S3 bucket's website endpoint (e.g., `your-frontend-app-bucket.s3-website-us-east-1.amazonaws.com`). Do *not* use the S3 REST API endpoint directly for static site hosting.
*   Configure cache behavior, SSL certificate (AWS Certificate Manager), and other settings as needed.
*   Consider creating an Origin Access Identity (OAI) or Origin Access Control (OAC) to restrict direct S3 access, allowing only CloudFront.

### 5. Set up AWS CodePipeline

*   **Source Stage:**
    *   Connect to your code repository (e.g., GitHub, AWS CodeCommit).
    *   Select the branch to deploy.
*   **Build Stage:**
    *   Provider: AWS CodeBuild.
    *   Create a new CodeBuild project:
        *   **Source:** CodePipeline.
        *   **Environment:** Managed image, operating system (e.g., Amazon Linux 2), runtime (Node.js - select a version compatible with your project).
        *   **Buildspec:** Use a buildspec file (point to `frontend/buildspec.yml`).
        *   **Artifacts:** Type (e.g., S3), select a bucket for build artifacts (can be different from the hosting bucket).
        *   **Environment Variables (Optional but Recommended):**
            *   `SENTRY_ORG`
            *   `SENTRY_PROJECT`
            *   `SENTRY_AUTH_TOKEN`
            *   `NEXT_PUBLIC_SENTRY_DSN`
            *   `SENTRY_DSN`
            *   `NEXT_PUBLIC_SENTRY_ENABLED=true` (or false)
            *   `NODE_ENV=production`
*   **Deploy Stage:**
    *   Provider: Amazon S3.
    *   Region: Your S3 bucket's region.
    *   Bucket: Your S3 bucket for static website hosting (e.g., `your-frontend-app-bucket`).
    *   **Extract file before deploy:** Check this option.
    *   (Optional) After deployment, you might want to add a step to invalidate the CloudFront cache. This can be done using a Lambda function triggered by CodePipeline or a CodeBuild post-build step with AWS CLI commands.

    Example AWS CLI command for CloudFront invalidation (in CodeBuild post_build or a separate action):
    ```bash
    aws cloudfront create-invalidation --distribution-id YOUR_CLOUDFRONT_DISTRIBUTION_ID --paths "/*"
    ```

## Optional: Deployment to Vercel

Vercel is a platform optimized for Next.js applications and offers a seamless deployment experience.

### Prerequisites

*   A Vercel account (you can sign up with your GitHub, GitLab, or Bitbucket account).

### Steps

1.  **Import Project:**
    *   Go to your Vercel dashboard and click "Add New... > Project".
    *   Import your Git repository. Vercel will automatically detect that it's a Next.js project.

2.  **Configure Project:**
    *   **Root Directory:** If your Next.js app is not in the root of the repository, specify the correct path (e.g., `frontend`).
    *   **Build and Output Settings:** Vercel typically auto-detects Next.js settings.
        *   Build command: `next build` (or `npm run build`)
        *   Output Directory: `.next` (Vercel handles this automatically)
    *   **Environment Variables:** Add the necessary environment variables in the Vercel project settings (similar to the `.env.local` file).
        *   `SENTRY_ORG`
        *   `SENTRY_PROJECT`
        *   `SENTRY_AUTH_TOKEN` (if you want Vercel to handle Sentry uploads)
        *   `NEXT_PUBLIC_SENTRY_DSN`
        *   `SENTRY_DSN`
        *   `NEXT_PUBLIC_SENTRY_ENABLED`
        *   Any other runtime variables your application needs.

3.  **Deploy:**
    *   Click "Deploy". Vercel will build and deploy your application.
    *   Vercel provides a unique URL for each deployment and automatically updates your production domain if you set one up.

### Automatic Deployments with Vercel

Vercel automatically deploys new commits pushed to your connected Git branch (e.g., `main` or `master`). You can also configure preview deployments for pull requests.

### Sentry Integration with Vercel

Vercel has a Sentry integration that can simplify the process of uploading source maps and associating commits. You can install the Sentry integration from the Vercel marketplace. If using the Vercel Sentry integration, you might not need to manually configure `SENTRY_AUTH_TOKEN` as an environment variable in Vercel, as the integration might handle authentication. Refer to Vercel and Sentry documentation for the most up-to-date integration steps.
The `next.config.ts` already includes `automaticVercelMonitors: true` in the Sentry options, which is beneficial for Vercel deployments.
