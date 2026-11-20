# Preview and publish on Render

## See the design immediately — no installation

1. Open the private GitHub repository and use **Code → Download ZIP**, or the commit-specific ZIP link supplied in chat. Codex source panels may display HTML instead of offering a download.
2. Extract the ZIP and open `preview/education-reach-preview.html` using Chrome, Edge, Safari or Firefox.
3. Explore the map, filters, initiative list, detail cards and exports. Everything needed to display the map is in this file; no account or server is required.

This preview includes 79 resolved full-postcode locations and 53 labelled representative-postcode estimates. Filter counts update with other selections. Pins and areas use stage colours; estimates remain distinct. Saved coverage now contains 264 genuine 45-minute driving/public transport areas for all 132 initiatives (arrival Monday 23 November 2026, 08:30 London time), including 53 labelled representative-location estimates. The default Open view includes all 90 Open records; other stages show future scenarios. Filters and modes work locally; saved initiative/representative postcodes can be searched offline. Other postcode searches need internet access to Postcodes.io and send only the entered postcode. Live journey recalculation requires the server. Keep the file private and regenerate it after UI/data changes with `npm run preview:download`.

## Publish the full app privately on Render

The prepared `render.yaml` configures a Node web service, not a static site. It protects the app and its API with a browser username/password prompt. Render supplies HTTPS and the public service address; credentials are required to see internal records. A health check exposes only `{ "status": "ok" }`.

1. **Use the private `carlowillo/CC-Education-website` GitHub repository.** The owner confirmed its private visibility in this chat. Keep this internal dataset private.
2. **Use the prepared source on `main`.** It contains the application, bundled data, `package.json` and `render.yaml` at the repository root. A manual source upload is unnecessary.
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
3. All 53 incomplete source locations now have labelled representative postcode estimates. Confirm actual site postcodes separately; estimates are never promoted to confirmed addresses. Journey settings can exclude estimates from coverage. The 79 source full postcodes remain resolved and bundled.
4. Sending coordinates, including estimates, and anonymised IDs to TravelTime was approved by the owner on 20 November 2026. To refresh coverage, select a future London arrival date/time and calculate. Uncached provider searches may incur costs. The stage filter controls inclusion: keep only Open selected when assessing current provision. Other stages show future scenarios in different colours.

The free service uses ephemeral storage: coordinate and coverage caches can disappear after a restart or deployment, causing geocoding/routing to run again. Free services may sleep when idle and take time to wake up. For regular internal use, choose a suitable paid plan with durable cache storage or a database as a separate deployment improvement; no paid resources have been provisioned by this work.

## What has actually been published

No Render deployment or URL has been created by the agent: no Render account or API access is connected. The source, password gate, Render blueprint and downloadable preview are available in the private GitHub repository. Completing the account-linking and deployment steps above publishes the hosted app. Publishing a Codex development environment alone does not do that.
