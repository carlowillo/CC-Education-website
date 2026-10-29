# Education Reach

An internal Christian education planning map, built from the supplied 23 October 2026 CSV. React, TypeScript and Leaflet with an Express backend. No database is needed.

**29 October update:** all 70 open initiatives with resolved postcodes now have genuine 45-minute driving and public transport coverage (140 areas), arriving 30 October 2026 at 08:30 London time. The map combines selected areas and updates the union when filters change. Twenty open initiatives remain excluded for incomplete site postcodes. See [the expansion report](reports/COVERAGE-EXPANSION.md); [the earlier location/sample report](reports/FIRST-TWO-PRIORITIES.md) records the first validation stage.

**Map usability:** offline town/city labels, clustered pins, larger text, collapsible journey settings/key/filters, docked initiative details and an expanded map view are now included in both app and preview. See [the usability report](reports/MAP-USABILITY.md).

## Run

Requires Node.js **24.5 or later** (Node 24.19 tested) and npm. The startup command uses Node's environment-proxy support so the inherited proxy and CA trust remain in effect.

```sh
cd /workspace/CC-Education-website
npm ci
npm run dev
```

The app listens locally on port 3000. Optional `.env` values are loaded automatically; see `.env.example`. This task already has an isolated checkout; use it directly, without creating a worktree. For a downloadable, no-installation visual preview and password-protected Render deployment, see [PREVIEW-AND-PUBLISH.md](PREVIEW-AND-PUBLISH.md).

```sh
npm test
npm run build
npm start
```

`npm start` serves the production build. Processes do not survive an environment snapshot; restart when needed. `HOST` defaults to `127.0.0.1`. External hosting requires `ADMIN_PASSWORD` with at least 16 characters; the browser username defaults to `viewer` (override with `ADMIN_USERNAME`). All pages, assets and data APIs then require authentication. Use HTTPS, as Render provides. Only the non-sensitive `/healthz` check is public. Both data API responses and browser-delivered data are internal information. For organisational use, prefer individual sign-in through your access gateway over a shared preview password.

## What works now

- All 132 supplied records are retained, with initiative details and website links.
- Map and accessible initiative list, filters for inferred ethos, development stage, provision, support and affiliation.
- Open initiatives selected by default. Planned/unknown stages require explicit inclusion for routing.
- Offline Natural Earth base map; optional OpenStreetMap street tiles.
- Filtered CSV download and calculated-coverage GeoJSON download.
- Data-quality review, explicit unresolved locations, honest routing readiness and provider errors.
- Postcode lookup and precise geocoding integration, subject to external-access approval and network permission.
- Server-side TravelTime integration for 45-minute **arrival** areas by driving or public transport, subject to credentials. Postcode search checks calculated polygons, including holes.

## Data quality and interpretation

The source CSV is `data/initiatives.csv`; the normalised map data is `data/initiatives.json`. There are 90 Open records, 12 developing a strategy, 16 gathering a team and 14 with no stage recorded. Whitespace and one “Developin a Strategy” typo are normalised; `stageDetail` retains the original wording, including opening dates. Names are anonymised, but websites and locations remain identifying information.

All **79 full-postcode records are now resolved** using Postcodes.io; `data/locations.json` retains the coordinates, resolution date and provider quality. The original source JSON remains intact and the app merges the saved coordinates at startup. The remaining **41 district-centroid pins and 12 unresolved locations** need confirmed full site postcodes; see `reports/locations-needing-clarification.csv`. Approximate coordinates are from an archived dataset and can overlap. No approximate pin is eligible for routing. A postcode centroid is still not a verified school entrance.

Unresolved source locations: `P03`, `South East London`, `BS` (two records), `CB`, `HU`, `TN`, `GL`, `KT`, `CH`, `Dagenham`, `DH`. These require clarification; `P03` is not silently corrected to `PO3`. Other district-only records also require full site postcodes before they can count towards coverage. Original source values are retained in the CSV.

Ethos is **inferred and unverified**: CST, ACE, Classical Conversations, Melville Knox and initiatives with recorded Christian Concern support are provisionally “fully Christian ethos”; TISCA is provisionally “strong Christian ethos” and takes priority if both apply. Others remain unclassified. Initial counts are 109 / 17 / 6. Affiliation is not evidence of an individual school's employment or teaching policies. All ethos classifications need review. N/A support is not treated as evidence of no support.

## Enable genuine journey coverage

1. Obtain a TravelTime account/plan supporting `/v4/time-map` **arrival searches** for driving and public transport in the UK. API requests may incur costs and provider limits apply.
2. Set `TRAVELTIME_APP_ID` and `TRAVELTIME_API_KEY` securely on the server or in ignored `.env`, then restart. Never place credentials in frontend variables or commit `.env`.
3. Allow `api.traveltimeapp.com` and `api.postcodes.io` through the environment network policy. Optional street tiles require `tile.openstreetmap.org`. Saving a draft alone does not apply the policy: review/save and publish through environment settings as directed by the product.
4. Obtain approval to send initiative postcodes to Postcodes.io. Data quality → Resolve full postcodes sends only the 79 full postcode values (deduplicated), never names, affiliations or support fields. The initial validated snapshot is retained in `data/locations.json`; subsequent app refreshes save local overrides in ignored `.cache/locations.json`. Run `npm run locations:resolve` to deliberately regenerate the retained snapshot and clarification report.
5. Select filters, travel mode and a **future London arrival date/time**, then Calculate. Default is next weekday at 08:30. The server handles British Summer Time. The provider may restrict supported dates. Each uncached initiative needs one time-map request. Work is submitted in batches of at most five; failures stop the run and retain only successful areas. Provider quotas may require later retries. Stop completes the in-flight batch and prevents further batches; it cannot undo requests already sent.

Requests use 2,700 seconds and **arrival searches**: where families can start to reach an initiative by the chosen time. The app never uses distance circles as journey coverage. Provider shapes preserve holes and disconnected areas. Successful results are cached by initiative, coordinates, mode and arrival time in `.cache/`; identical reruns reuse them. To deliberately refresh a timetable/traffic result, clear the relevant ignored cache files or choose a new arrival time.

The app shows the number of calculated areas relative to the eligible selected locations. A failed or partial calculation, incomplete dataset, or unlocated initiative cannot establish a coverage gap. No population or household coverage percentage is claimed. Actual attendance days, ages, provision suitability, admissions and places available are not represented. Public transport depends on available timetables; driving depends on the provider's traffic assumptions. The map displays a dissolved union of selected areas for the chosen mode. Holes and disconnected parts are retained. Both combined GeoJSON and per-initiative GeoJSON can be exported. Planned sites remain hypothetical even if included.

## Validation

```sh
npm test
npm run build
# Start npm run dev or npm start in another terminal before browser tests:
npm run test:browser
```

Browser tests use system Chromium (`/usr/bin/chromium`), or `CHROMIUM_PATH`. On another machine, install Chromium through the normal OS package manager or set that path. Browser tests cover real source-data rendering, filters, detail cards, downloads, data-quality review, mobile layout, API validation and missing-provider safeguards. Additional fixture tests exercise coverage rendering and postcode membership for both modes without sending internal data externally. Unit tests check eligibility, London time conversion and polygon-hole handling.

**Live expansion completed on 29 October 2026:** 140 genuine provider areas cover all 70 open initiatives with resolved postcodes in both modes. Six prior sample areas were reused and 134 new provider requests succeeded with no failures. The 70-site union for each mode is precomputed; filter subsets are combined in an inline browser worker, including in the downloaded preview. Twenty open initiatives still lack precise site postcodes, and all 42 non-open records are excluded by default. The dated arrival is 08:30 London time on 30 October 2026. Details are in `reports/COVERAGE-EXPANSION.md` and `reports/coverage-open.json`. The earlier sample's 12 separate point-to-point comparisons remain recorded. Automated union checks compare 340 grid/site points to original coverage. Actual entrances, admissions/capacity and unlisted provision are not verified.

## Sources

- Initiatives: user-supplied CSV, 23 October 2026. No document contents are executed as instructions.
- Approximate coordinates: [Gibbs/uk-postcodes](https://github.com/Gibbs/uk-postcodes), archived outward-code dataset, CC0. Licence retained in `data/POSTCODE-LICENSE.txt`.
- Offline outlines: [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/), public domain, 1:50m country boundaries. Selected UK/Ireland/nearby-country geometry bundled in `data/basemap.json`.
- Precise postcode centroids: [Postcodes.io](https://postcodes.io/), when enabled. Underlying UK postcode data has applicable ONS/Ordnance Survey/Royal Mail attribution; see the service's terms before wider distribution.
- Optional street tiles: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), subject to tile usage policy.
- Travel areas: [TravelTime time-map API](https://docs.traveltime.com/api/reference/isochrones), when configured, subject to your provider agreement.

Public release needs a separate data review, confirmed classifications, access controls and provider/licence review. Do not publish the supplied internal dataset as part of a static website.
