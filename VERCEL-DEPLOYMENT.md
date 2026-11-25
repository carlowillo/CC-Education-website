# Deploy the password-protected website on Vercel

Use the private GitHub repository **carlowillo/CC-Education-website**, branch **main**. The shared username/password login is implemented in the app and protects HTML, JavaScript, fonts and data APIs. Vercel's separate paid Password Protection feature is not required for this login.

## What you need

- Access to the private GitHub repository.
- A Vercel account/team with permission to import it. Choose a plan suitable for your organisation's use; review current pricing and repository restrictions in Vercel.
- A password of your choosing: **at least 20 characters recommended; 16 is the enforced minimum**. Save it in your password manager.
- Optional: actual TravelTime account credentials for calculating new travel areas. They are not needed for the bundled map or postcode search.

## Step by step

1. Sign in at **https://vercel.com/** using your GitHub account.
2. Choose **Add New → Project** (or **New Project**).
3. Find **carlowillo/CC-Education-website** and choose **Import**. If missing, choose the option to configure GitHub repository access and grant Vercel access to this private repository. Keep its GitHub visibility private.
4. Enter a project name, such as **christ-centred-school-map**. Leave **Root Directory** at the repository root. Use the **main** branch.
5. Set **Framework Preset** to **Other**. Leave the Build Command and Output Directory overrides off. The committed `vercel.json` and `vercel-build` script configure one protected Node function. Do not switch this project to an ordinary Vite static-site deployment: that would change the password-protection architecture.
6. Under **Environment Variables**, add these values for **Production and Preview**:

   | Name | Value |
   | --- | --- |
   | `ADMIN_USERNAME` | `viewer` |
   | `ADMIN_PASSWORD` | Your own strong password, at least 16 characters; 20+ recommended |

   Enter the actual password without surrounding quotes. Mark it sensitive when Vercel offers that option. Do not put it in GitHub or send it in chat. Vercel supplies the hosting port/runtime flags; no HOST or PORT value is needed.
7. If you want fresh journey calculations, also add `TRAVELTIME_APP_ID` and `TRAVELTIME_API_KEY` for Production and Preview. Use the actual values from your TravelTime account. Credentials configured in Codex are not automatically transferred; proxy placeholder values must not be copied. You can add these later and redeploy.
8. Click **Deploy**. Node **24.x** is declared in `package.json`. The Vercel Node builder installs dependencies, runs `npm run vercel-build`, creates the frontend and packages the saved coverage. Wait for the deployment to show **Ready**.
9. Open the **Production domain** from the project Overview, normally `https://YOUR-PROJECT.vercel.app`. Use this domain for sharing; commit/preview URLs may additionally require a Vercel account.
10. The browser should ask for a username and password. Enter **viewer** and the password you saved in step 6. Test once in a new private/incognito window so an old login is not reused.
11. Check the main page, postcode search, filters, driving/public transport, and the purple selected-initiative count. Both modes use the bundled saved coverage immediately. To verify access protection, open `/api/initiatives` in a separate fresh private window: it must ask for the same login.
12. Optional: open **Settings → Domains** in Vercel and add a hostname authorised by your website administrator. Copy the DNS record Vercel gives you to the domain's DNS settings, wait for verification and HTTPS, then use that address to share the site. No custom domain is required to use the initial `.vercel.app` address.

## What works without additional services

The deployment bundles all 132 initiatives and 264 saved driving/public transport areas. Mode changes, filtering, initiative details and saved coverage work without TravelTime credentials. Full postcode search uses Postcodes.io and needs no API key. Coverage represents the saved **23 November 2026, 08:30 London time** snapshot; the 53 representative locations remain labelled estimates.

The Map settings control in the footer supports fresh calculations when actual TravelTime credentials are configured. Vercel uses one initiative per calculation request to stay within a 60-second function budget. Provider limits and usage charges still apply. Calculations and geocoding overrides are cached only in temporary Vercel storage and may disappear between invocations. Live results are shown in that browser session. To publish a refreshed shared snapshot, regenerate the retained coverage files, commit/push them to `main`, and let Vercel redeploy. No durable database has been added.

## Password and deployment changes

- Change credentials in **Project Settings → Environment Variables**, then **redeploy** for them to take effect. Test the new credentials in a fresh private window.
- A shared browser login is used; there are no individual accounts or password-reset emails. Share credentials only with authorised colleagues through your normal secure channel.
- Do not upload `preview/education-reach-preview.html` as a public static file. That file is a separate offline copy containing the dataset, and cannot acquire password protection by itself. The Vercel configuration serves the app through the protected function instead.
- `/healthz` is the only unauthenticated app endpoint and returns only `{"status":"ok"}`.

## If something goes wrong

- **Repository not listed:** configure Vercel's GitHub integration and select this repository. Organisation-owned private repositories may require a suitable Vercel team/plan and repository-owner approval.
- **Build fails:** check Build Logs and confirm `main` contains `vercel.json`, `api/index.ts` and the `vercel-build` script. Use Framework Preset Other and Node 24.x. The log should include “Prepared 264 protected travel areas”.
- **Function fails on first visit:** check Runtime Logs. A missing or too-short `ADMIN_PASSWORD` deliberately prevents startup. Add valid credentials for the environment being visited and redeploy.
- **Another Vercel sign-in page appears:** use the Production domain, then review Project Settings → Deployment Protection if your team has enabled additional Vercel authentication. The app's own username/password remains mandatory.
- **Map works but fresh calculation does not:** verify actual TravelTime credentials and provider access. The saved map remains usable without them.

## Implementation and validation

All routes go to the single Node function in `api/index.ts`; there is no public static-site builder. The compiled frontend is served by Express after the password middleware. Deployment data remains inside the server function. The approximately 49 MB raw coverage response is compressed at build time and delivered as authenticated chunks of at most 1 MiB. The browser checks their size and SHA-256 digest before loading the map. This avoids a single oversized function response. Temporary writes use `/tmp`.

For a local production build: `npm ci --include=dev`, then `npm run vercel-build`. Ordinary local/Render hosting still uses `npm start`. The Vercel build and function can be validated without deploying; an actual hosted deployment requires your Vercel account and the steps above.
