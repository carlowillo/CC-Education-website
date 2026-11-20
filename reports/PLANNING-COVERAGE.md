# All-stage planning coverage — 20 November 2026

All 132 supplied initiatives now have genuine 45-minute TravelTime arrival areas for driving and public transport: **264 areas**, with no missing results. Every search uses **Monday 23 November 2026 at 08:30 Europe/London** (08:30 UTC) and a 2,700-second journey limit.

| Stage | Source full postcodes | Representative postcode estimates | Total |
| --- | ---: | ---: | ---: |
| Open | 70 | 20 | 90 |
| In development | 9 | 19 | 28 |
| Not recorded | 0 | 14 | 14 |
| All records | 79 | 53 | 132 |

The default Open view includes all 90 Open initiatives. Selecting other stages includes their saved areas as future scenarios. Estimated locations can be excluded in Journey settings: 70 Open sites, or 79 across all stages, then contribute. Map pins and areas use green for Open, amber for development and grey for unrecorded stages. Estimated areas retain dashed boundaries and lighter fill. Five stage/location-quality unions per mode preserve these distinctions; filters rebuild subsets locally, including in the standalone preview.

## Permission and provider execution

The owner explicitly approved sending coordinates, including estimates, and anonymised IDs to TravelTime in this chat on 20 November 2026. No website, ethos, affiliation or support fields were sent. Credentials remain server-side and are not included in snapshots or the preview.

The first run checkpointed 187 successful areas before one provider rate-limit response. After waiting for the reset, requests were slowed to fewer than 20 per minute. The resumed run reused all 187 checkpoints and completed the remaining 77 areas. Across both runs there were 54 successful provider batches and one rejected rate-limit request; all requested areas ultimately completed. `reports/coverage-planning.json` records current inputs, provenance, counts, permission and the resume history.

## Interpretation and retained files

Provider-calculated geometry around a representative postcode remains an **estimated initiative location**, not a confirmed school address. Broad area references can be far from the actual initiative. Invalid source P03 is explicitly assumed to mean PO3; the original value remains unchanged. Confirm all 53 estimated locations before relying on them for planning decisions. Source full-postcode centroids also remain unverified entrances.

- Individual areas: `data/coverage-planning.geojson`.
- Stage/location-quality unions: `data/coverage-planning-combined.geojson`.
- Original source and resolved full-postcode snapshot: `data/initiatives.csv`, `data/initiatives.json`, `data/locations.json` (unchanged).
- Estimate assignments and basis: `data/estimated-locations.json`, `reports/estimated-locations.csv` (unchanged).
- Historical October coverage remains available separately in `data/coverage-open.geojson` and its original report.

Journey models and timetables are tied to the selected arrival time. Available places, admissions, ages and unlisted provision are not verified. Developing and unrecorded initiatives do not establish current provision. Complete results for this source list do not establish nationwide coverage or a confirmed gap.

## Validation

The production build, **23 automated checks** and **13 Chromium browser checks** pass.

Automated checks validate one area per initiative/mode, one consistent arrival time, stage/estimate provenance, finite closed rings, and the presence of each reference postcode inside its own returned polygon. Union checks compare all ten groups with their source areas at 132 reference postcodes and 100 additional UK grid points. Browser checks exercise the real saved estimated areas, postcode matches, estimate exclusion, stage changes and both modes, as well as the existing filter, layout, export and access-control checks. The standalone HTML is tested unchanged through a local fixture because managed Chromium blocks direct file URLs.
