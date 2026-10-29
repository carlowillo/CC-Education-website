# Preview and publish on Render

## See the design immediately — no installation

1. Download `education-reach-preview.html` from the link supplied in chat. If your browser offers to display the source, use Download or Save link as.
2. Double-click the downloaded file, or open it using Chrome, Edge, Safari or Firefox.
3. Explore the map, filters, initiative list, detail cards and exports. Everything needed to display the map is in this file; no account or server is required.

This preview includes 79 resolved postcode locations, 41 approximate district pins, 12 unresolved records, and genuine saved 45-minute driving/public transport areas for all 70 open initiatives with precise postcodes (arrival 30 October 2026 at 08:30 London time). Mode and filter changes rebuild combined coverage without new API requests. The other 20 open initiatives are explicitly excluded until their site postcodes are confirmed. Keep the file private. It does not perform live postcode lookups or travel calculations. Do not upload it to a public static website. Regenerate it after UI changes with `npm run preview:download`.

## Publish the full app privately on Render

The prepared `render.yaml` configures a Node web service, not a static site. It protects the app and its API with a browser username/password prompt. Render supplies HTTPS and the public service address; credentials are required to see internal records. A health check exposes only `{ "status": "ok" }`.

1. **Confirm that `carlowillo/CC-Education-website` is private on GitHub.** The repository privacy check was denied from this environment. Do not upload this dataset into a public repository. If needed, create a separate private repository.
2. **Upload the source.** Download and unzip `education-reach-source.zip`. In the private GitHub repository, choose Upload files (or Add file → Upload files). Drag the extracted folder's **contents** into the upload area, including the `src`, `server`, `data` and `scripts` directories. Keep the directories intact. `package.json` and `render.yaml` must appear at the repository root, not inside an extra outer folder. Commit the upload. The archive excludes credentials, Git metadata, dependencies, caches and generated output.
3. **Sign in at [Render](https://dashboard.render.com/).** Connect your GitHub account and grant Render access to that private repository.
4. **Create a Blueprint.** In Render, choose New → Blueprint, select the repository and deploy its `render.yaml`. Review the settings before creation. The file requests a free web-service plan in Frankfurt; confirm the current plan terms in Render. Use the branch containing the uploaded files. Leave the root directory empty.
5. **Wait for the build and deployment to finish.** The commands are `npm ci --include=dev --no-audit --no-fund && npm run build`, then `npm start`. Render sets the port. The blueprint sets Node 24.19.0 and `HOST=0.0.0.0`.
6. **Get your private login.** Open the service's Environment page. `ADMIN_USERNAME` is `viewer`. Render generates `ADMIN_PASSWORD`; reveal/copy it there, or replace it with your own password of at least 16 characters and save/redeploy. Do not send the password in chat or commit it to GitHub.
7. **Open the service URL shown by Render.** Your browser asks for the username and password. After signing in, you can preview and use the website. Share the link and credentials only with authorised colleagues, through your normal secure channel.

If you create a web service manually instead of using a Blueprint, use the same commands and set `NODE_VERSION=24.19.0`, `NODE_ENV=production`, `HOST=0.0.0.0`, `ADMIN_USERNAME=viewer` and a secure `ADMIN_PASSWORD` of at least 16 characters. Set the health-check path to `/healthz`. External startup fails if the password is missing or too short.

## Turn on postcode lookup and real 45-minute travel areas

The appearance, filters and approximate map do not require routing credentials.

1. Add **your actual** `TRAVELTIME_APP_ID` and `TRAVELTIME_API_KEY` in Render's Environment page, then save/redeploy. Credentials configured in the Codex cloud environment are not automatically transferred to Render; do not copy proxy placeholders. Your TravelTime plan must support arrival-based time-map searches for driving and public transport.
2. In the website, open Data quality → Resolve full postcodes. Sending the full postcode values to Postcodes.io was authorised by the dataset owner in this chat. No names, affiliations or support details are sent.
3. Resolve ambiguous and district-only source locations separately. There are 41 approximate district pins and 12 unresolved records; the other 79 full-postcode records have already been resolved and are bundled in the source. Only precise full-postcode locations are eligible for travel calculations.
4. Select a future London arrival date/time and calculate coverage. Uncached provider requests may incur costs. Keep planned initiatives excluded when assessing current provision.

The free service uses ephemeral storage: coordinate and coverage caches can disappear after a restart or deployment, causing geocoding/routing to run again. Free services may sleep when idle and take time to wake up. For regular internal use, choose a suitable paid plan with durable cache storage or a database as a separate deployment improvement; no paid resources have been provisioned by this work.

## What has actually been published

No Render deployment or URL has been created by the agent: no Render account or API access is connected. The source, password gate, Render blueprint and downloadable preview have been prepared locally. Completing the account-linking and deployment steps above publishes the hosted app. Publishing a Codex development environment alone does not do that.
