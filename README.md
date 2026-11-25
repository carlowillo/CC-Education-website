# Education Reach

An internal Christian education planning map, using the updated school spreadsheet supplied on 25 November 2026. React, TypeScript and Leaflet with an Express backend. No database is needed.

**25 November dataset update:** all 132 initiative names now follow `20261023 Data for Map - Schools Renamed.xlsx`, retained verbatim as `data/initiatives-source.xlsx`. The other six source columns are unchanged, so initiative IDs, coordinates, filter counts and all 264 saved travel areas remain valid. The 42 “School Name in Progress” placeholders are preserved as supplied. App, postcode results, coverage exports and offline preview use current names; original provider geometry and historical reports are retained. See [the dataset update](reports/DATASET-UPDATE.md).

**20 November update:** filter counts respond to the other selected groups. Map pins and travel areas use purple for Open, orange for development, and slate for unrecorded stages. All 53 incomplete locations now have explicitly estimated representative postcodes, while the source values and 79 resolved full postcodes remain intact. With the owner’s explicit approval, all 132 initiatives now have genuine TravelTime driving and public transport areas (264 total), arriving at 08:30 London time on Monday 23 November 2026. The default Open view contains 90 initiatives, including 20 estimated locations. Selecting other stages includes developing/unrecorded scenarios; turning estimates off limits coverage to the 79 source full postcodes. See [the change report](reports/FILTERS-AND-ESTIMATES.md).

**Map usability:** offline town/city labels, clustered pins, larger text, collapsible journey settings/key/filters, docked initiative details and an expanded map view are now included in both app and preview. See [the usability report](reports/MAP-USABILITY.md).

**Branding:** the app and preview now follow the supplied Christian Concern Education references, with navy, cream, red and purple, locally bundled Montserrat, serif introductory copy, a matching masthead and footer, and rectangular controls. The wordmark is a typographic recreation; original assets and exact brand specifications could not be verified because the reference site is blocked by the environment network policy. See [the branding notes](reports/BRANDING.md).

**23 November interface update:** the main wording is now “Christ-centred education. Within reach.” The map has one compact toolbar for filters, postcode search and the purple selected-initiative count. The driving/public transport switch is in the bottom bar. Arrival-time labels, the estimated/eligible-site summary, top-right list/data-quality buttons and repeated map statistics have been removed from the default view. Optional tools are in the footer: Map settings, Initiative list, Review the data and Coverage details.

## Run

For password-protected Vercel hosting, use [VERCEL-DEPLOYMENT.md](VERCEL-DEPLOYMENT.md). The deployment keeps the repository private and gates the page, assets and data APIs behind the app's shared login. Vercel's separate password-protection add-on is not needed.

Requires Node.js **24.5 or later** (Node 24.19 tested) and npm. The startup command uses Node's environment-proxy support so the inherited proxy and CA trust remain in effect.

```sh
cd /workspace/CC-Education-website
npm ci
npm run dev
```

The app listens locally on port 3000. Optional `.env` values are loaded automatically; see `.env.example`. This task already has an isolated checkout; use it directly, without creating a worktree. For a downloadable, no-installation visual preview and password-protected Render deployment, see [PREVIEW-AND-PUBLISH.md](PREVIEW-AND-PUBLISH.md).

```sh
npm run vercel-build
npm test
npm start
```

The integration tests use the compiled frontend and prepared Vercel coverage, so run `npm run vercel-build` before `npm test` in a fresh checkout.

`npm start` serves the production build. Processes do not survive an environment snapshot; restart when needed. `HOST` defaults to `127.0.0.1`. External hosting requires `ADMIN_PASSWORD` with at least 16 characters; the browser username defaults to `viewer` (override with `ADMIN_USERNAME`). All pages, assets and data APIs then require authentication. Use HTTPS, as Render provides. Only the non-sensitive `/healthz` check is public. Both data API responses and browser-delivered data are internal information. For organisational use, prefer individual sign-in through your access gateway over a shared preview password.

## What works now

- All 132 supplied records are retained, with initiative details and website links.
- Map and accessible initiative list, filters for inferred ethos, development stage, provision, support and affiliation. Counts apply other groups (AND), while options within a group are alternatives (OR). Zero-count selected options can always be deselected.
- Open initiatives selected by default. Selecting other stages includes their available areas as future scenarios, with separate colours. No additional planned-stage switch is required.
- Offline Natural Earth base map; optional OpenStreetMap street tiles.
- Calculated-coverage GeoJSON download through the optional coverage details.
- Data-quality review, explicit unresolved locations, honest routing readiness and provider errors.
- Postcode lookup and precise geocoding integration, subject to external-access approval and network permission.
- Server-side TravelTime integration for 45-minute **arrival** areas by driving or public transport, subject to credentials. Postcode search checks calculated polygons, including holes.

## Data quality and interpretation

The authoritative supplied workbook is `data/initiatives-source.xlsx`; `data/initiatives.csv` is its CSV representation and `data/initiatives.json` is the normalised map data. `data/source.json` records the original filename, sheet and update date. There are 90 Open records, 12 developing a strategy, 16 gathering a team and 14 with no stage recorded. Whitespace and one “Developin a Strategy” typo are normalised; `stageDetail` retains the original wording, including opening dates. Names match the updated workbook, including 42 placeholders; websites and locations remain identifying information.

All **79 full-postcode records are resolved** using Postcodes.io; `data/locations.json` retains the coordinates, resolution date and provider quality. Source postcodes and all non-name fields are preserved. The remaining **53 records** use current representative postcodes, merged from `data/estimated-locations.json`, with `precision: estimated`. Representative postcodes are chosen near the recorded district centre; broad areas use a stated central reference district. `reports/estimated-locations.csv` records each assignment and its basis. Estimated routing is enabled by default and can be excluded in Journey settings. Pins use dashed borders; returned areas use dashed boundaries and lighter fill. None of these assignments asserts the actual school address. A source full-postcode centroid is also not a verified entrance.

Broad source locations include `South East London`, `BS` (two records), `CB`, `HU`, `TN`, `GL`, `KT`, `CH`, `Dagenham`, and `DH`. Their central references can be far from the actual initiative. Invalid source `P03` is explicitly assumed to mean `PO3`, recorded in the estimate basis and visible in details. All 53 still need confirmation using `reports/locations-needing-clarification.csv`; source postcode values remain unchanged.

Ethos is **inferred and unverified**: CST, ACE, Classical Conversations, Melville Knox and initiatives with recorded Christian Concern support are provisionally “fully Christian ethos”; TISCA is provisionally “strong Christian ethos” and takes priority if both apply. Others remain unclassified. Whole-source counts are 109 / 17 / 6; the default Open filter shows 67 / 17 / 6. Ethos filters and detail badges remain available, while map colours now show development stage. Affiliation is not evidence of an individual school's employment or teaching policies. All ethos classifications need review. N/A support is not treated as evidence of no support.

## Enable genuine journey coverage

1. Obtain a TravelTime account/plan supporting `/v4/time-map` **arrival searches** for driving and public transport in the UK. API requests may incur costs and provider limits apply.
2. Set `TRAVELTIME_APP_ID` and `TRAVELTIME_API_KEY` securely on the server or in ignored `.env`, then restart. Never place credentials in frontend variables or commit `.env`.
3. Allow `api.traveltimeapp.com` and `api.postcodes.io` through the environment network policy. Optional street tiles require `tile.openstreetmap.org`. Saving a draft alone does not apply the policy: review/save and publish through environment settings as directed by the product.
4. Obtain approval to send initiative postcodes to Postcodes.io. Data quality → Resolve full postcodes sends only the 79 full postcode values (deduplicated), never names, affiliations or support fields. The initial validated snapshot is retained in `data/locations.json`; subsequent app refreshes save local overrides in ignored `.cache/locations.json`. Run `npm run locations:resolve` to deliberately regenerate the retained snapshot and clarification report.
5. Obtain explicit permission to send initiative coordinates to TravelTime. Select stage/other filters, choose whether estimated locations contribute, then select a **future London arrival date/time** and Calculate. The default is the saved snapshot time; choose a future time to recalculate. The server handles British Summer Time. The provider may restrict supported dates. Each uncached initiative uses a provider search; usage may incur costs. Work is submitted in batches of at most five; failures stop the run and retain only successful areas. Stop finishes the in-flight batch and prevents further batches.

To deliberately regenerate representative postcodes: `npm run locations:estimate`. Permission to send coordinates and anonymised IDs to TravelTime was granted in this chat on 20 November 2026. To refresh a consistent all-stage snapshot: `npm run routing:planning -- YYYY-MM-DDTHH:MM`, then `npm run routing:planning:combine`, and `npm run preview:download`. The planning script checkpoints each result, limits calls to fewer than 20 requests/minute with up to five searches per request, and records inputs, estimates, failures and arrival time in `reports/coverage-planning.json`. Failed provider calls never become fabricated travel areas.

Requests use 2,700 seconds and **arrival searches**: where families can start to reach an initiative by the chosen time. The app never uses distance circles as journey coverage. Provider shapes preserve holes and disconnected areas. Successful results are cached by initiative, coordinates, mode and arrival time in `.cache/`; identical reruns reuse them. To deliberately refresh a timetable/traffic result, clear the relevant ignored cache files or choose a new arrival time.

The app shows calculated/eligible counts, estimated-location counts, exclusions and areas awaiting calculation. Partial coverage cannot establish a gap. No population or household percentage is claimed. Attendance days, ages, suitability, admissions and available places are not represented. Public transport depends on timetables; driving depends on provider traffic assumptions. Unions are built separately by stage and location quality so their colours and estimate labels survive filtering and export. Holes and disconnected parts are retained. Different coloured layers can overlap; future initiatives and estimated locations remain scenarios even if a provider calculates a real journey area around the reference point.

## Validation

```sh
npm run vercel-build
npm test
# Start npm run dev or npm start in another terminal before browser tests:
npm run test:browser
```

Browser tests use system Chromium (`/usr/bin/chromium`), or `CHROMIUM_PATH`. On another machine, install Chromium through the normal OS package manager or set that path. Browser tests cover real source-data rendering, filters, detail cards, downloads, data-quality review, mobile layout, API validation and missing-provider safeguards. Additional fixture tests exercise coverage rendering and postcode membership for both modes without sending internal data externally. Unit tests check eligibility, London time conversion and polygon-hole handling.

**Current planning coverage, 20 November 2026:** all 264 areas for 132 initiatives use the same 23 November arrival. The 79 source full-postcode locations and 53 estimates remain separate in data, map styles, postcode results and exports. Ten precomputed unions retain stage/quality distinctions across both modes. See [the current coverage report](reports/PLANNING-COVERAGE.md) and `reports/coverage-planning.json`.

**Historical expansion, 29 October 2026:** 140 genuine provider areas cover all 70 open initiatives with resolved postcodes in both modes. Six prior sample areas were reused and 134 new provider requests succeeded with no failures. The 70-site union for each mode is precomputed; filter subsets are combined in an inline browser worker, including in the downloaded preview. That historical snapshot excludes 20 incomplete Open locations and all 42 non-open records. It remains in the repository for comparison. Its dated arrival is 08:30 London time on 30 October 2026. Details are in `reports/COVERAGE-EXPANSION.md` and `reports/coverage-open.json`. The earlier sample's 12 separate point-to-point comparisons remain recorded. Automated union checks compare 340 grid/site points to original coverage. Actual entrances, admissions/capacity and unlisted provision are not verified.

## Sources

- Initiatives: user-supplied Schools Renamed workbook, received 25 November 2026; preserved as `data/initiatives-source.xlsx`. No document contents are executed as instructions.
- Approximate coordinates: [Gibbs/uk-postcodes](https://github.com/Gibbs/uk-postcodes), archived outward-code dataset, CC0. Licence retained in `data/POSTCODE-LICENSE.txt`.
- Offline outlines: [Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/), public domain, 1:50m country boundaries. Selected UK/Ireland/nearby-country geometry bundled in `data/basemap.json`.
- Precise postcode centroids: [Postcodes.io](https://postcodes.io/), when enabled. Underlying UK postcode data has applicable ONS/Ordnance Survey/Royal Mail attribution; see the service's terms before wider distribution.
- Optional street tiles: © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), subject to tile usage policy.
- Travel areas: [TravelTime time-map API](https://docs.traveltime.com/api/reference/isochrones), when configured, subject to your provider agreement.

Public release needs a separate data review, confirmed classifications, access controls and provider/licence review. Do not publish the supplied internal dataset as part of a static website.
