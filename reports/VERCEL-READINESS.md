# Password-protected Vercel deployment readiness

Validated 25 November 2026. Deployment instructions are in [VERCEL-DEPLOYMENT.md](../VERCEL-DEPLOYMENT.md). No Vercel deployment has been created: the user must import the private repository and enter their credentials in their own Vercel account.

## Prepared configuration

- `vercel.json` routes every request to one Node function, `api/index.ts`, using the official `@vercel/node` builder. HTML, scripts, fonts and APIs all pass through the existing shared username/password gate. Only `/healthz` is public and contains no data.
- The Vercel entry explicitly selects serverless mode and refuses startup without an `ADMIN_PASSWORD` of at least 16 characters, even if system environment flags are absent. Passwords remain server environment variables and are never embedded in the frontend.
- Node 24.x, a 60-second function budget and writable temporary storage are configured. Live routing uses one initiative per request and the existing 45-second provider timeout.
- `vercel-build` creates the frontend and validates/compresses the retained snapshot. All 264 areas and ten stage/location unions are preserved. The 10,712,654-byte gzip payload is delivered in 11 authenticated chunks, each at most 1 MiB; the browser validates SHA-256 and length before decoding. This avoids sending the original approximately 49 MB JSON in one function response.
- The generated function is approximately 16 MiB on disk. Offline preview files, local caches and the large raw retained-coverage files are excluded from it. Source data and coverage files have not changed.

## Checks completed

- `npm run vercel-build`: TypeScript, production Vite bundle and protected coverage preparation pass.
- `npm test`: all 26 checks pass, including missing/wrong passwords, page/asset/API protection, complete chunk delivery, Unicode transport, tamper/truncation rejection and existing coverage/filter/routing checks.
- Official Vercel Node builder invoked locally against the working tree: creates a Node 24.x function with handler `api/index.js`, 246 files and maxDuration 60. Required HTML, data and prepared coverage are included. Raw planning GeoJSON and offline HTML are excluded.
- The actual compiled function, loaded without `tsx` or the Vercel system flag, runs successfully in Node. Chromium loads all 11 authenticated chunks, displays both modes, updates filter counts (90 default Open initiatives; 17 Strong Christian ethos), and completes a real Postcodes.io lookup for the public example SW1A 1AA. No browser exceptions or horizontal overflow at 390px. An independent unauthenticated browser context receives 401 for data.
- Existing desktop/mobile/offline browser regression suite: all 13 checks pass.
- `git diff --check`: passes. Existing standalone preview regenerated from the new client bundle.

## Operational scope

The bundled coverage remains the 23 November 2026, 08:30 London snapshot, with 53 labelled representative-postcode estimates. Browsing, filters, both saved modes and postcode search need no TravelTime credentials. Fresh calculations require actual TravelTime credentials, provider access and allowance. Temporary calculation caches are ephemeral; live results do not automatically replace the shared saved snapshot. The app uses a shared browser login rather than individual user accounts.

The hosted `.vercel.app` URL, Vercel project routing and optional custom domain still need the user's deployment and a fresh incognito smoke check on Vercel itself. Local validation is not a claim that a cloud deployment already exists. Current Vercel plan eligibility, pricing and GitHub repository permissions must be checked in the user's own account.
