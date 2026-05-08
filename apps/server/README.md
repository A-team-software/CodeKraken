This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/route.ts`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## API Routes

This directory contains example API routes for the headless API app.

For more details, see [route.js file convention](https://nextjs.org/docs/app/api-reference/file-conventions/route).

## Integration Tests

The server package includes opt-in integration tests for task execution and PR automation.

### Incremental PR Integration Test

This scenario validates incremental progression across three stages:

1. Plan persistence
2. First implementation todo (fibonacci)
3. Second implementation todo (factorial) after merged-PR webhook

It uses a real GitHub PR lifecycle for PR 1 (including merge), then invokes the merged webhook route to trigger the next iteration.

Required environment variables:

- `TEST_ENABLE_PR_INTEGRATION_TEST=true`
- `TEST_ENABLE_INCREMENTAL_PR_INTEGRATION_TEST=true`
- `TEST_GITHUB_TOKEN=<token with repo access>` (or `GITHUB_TOKEN`)
- Optional: `TEST_GITHUB_USER=<github-username>`
- Optional override: `TEST_INCREMENTAL_PR_REPO_URL=https://github.com/hervinhio/test-repo.git`

Run only this integration test:

```bash
pnpm vitest src/app/api/task/route.incremental-pr.integration.test.ts --run
```
