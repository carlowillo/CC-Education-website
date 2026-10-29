# Expanded coverage — 29 October 2026

Coverage now includes all **70 open initiatives with resolved full postcodes** in the supplied dataset, for both driving and public transport. All calculations use **arrival by 08:30 on Friday 30 October 2026, Europe/London** (08:30 UTC), with a 2,700-second travel limit.

| Outcome | Count |
| --- | ---: |
| Records marked Open | 90 |
| Open records with resolved postcodes | 70 |
| Genuine driving areas received | 70 |
| Genuine public transport areas received | 70 |
| Provider failures | 0 |
| Existing sample areas reused | 6 |
| New provider requests | 134 |
| Open records excluded for incomplete locations | 20 |
| Non-open records excluded from current coverage | 42 |

The 20 excluded open initiatives are listed in `coverage-exclusions.csv`; all 53 source records requiring full site postcodes remain in `locations-needing-clarification.csv`. Planned records with known postcodes are not counted as current provision. If users explicitly include them, their missing travel areas are reported rather than inferred.

## Combined map and filters

Each mode is displayed as a geometric union of the selected initiative areas. Internal overlap boundaries are dissolved. Holes and disconnected parts are preserved; no distance circles, geometry simplification or coordinate rounding are substituted. A balanced sequence of unions keeps the polygon library's event queue bounded for the 706,356 driving vertices and 80,309 public transport vertices.

The initial combined driving and public transport layers are precomputed. Ethos, provision, support, organisation and stage filters recompute selected boundaries in a browser worker without new routing requests. Changing filters cancels an obsolete union operation. The downloadable HTML includes the worker and saved data; it supports these filters without a server. The dated saved snapshot is explicit. Live recalculation and lookup of arbitrary new postcodes remain server operations.

The coverage summary shows contributing sites, missing site locations and eligible sites still awaiting a travel area. Review coverage & exclusions lists the actual selected records and reasons, and allows the combined GeoJSON to be exported. Per-initiative GeoJSON remains available from Methodology & sources. Hiding the layer retains its calculation counts.

## Validation and limitations

- All 140 individual areas contain their respective destination postcode centroids.
- Combined membership agrees with original per-site coverage at 340 checks spanning a UK grid and destination centroids, across both modes.
- Synthetic overlap/removal and hole tests check geometric combination semantics; mixed modes/times are rejected.
- Password protection covers the saved-coverage API as well as pages and other data endpoints.
- Browser checks exercise the real downloadable dataset, mode switches, combined export and filters. Home education hubs produce 3 calculated areas with 11 imprecise open locations; high-support initiatives produce 9 areas with 1 imprecise open location; CST produces 25 areas with 0 imprecise open locations.
- The earlier three-site sample's 12 separately requested point-to-point travel comparisons remain recorded in `routing-validation.json`. These are model comparisons, not on-the-ground validation of all 140 journeys.

Uncovered areas are **potential gaps**. Twenty known open initiatives lack precise locations; other initiatives may be unlisted. Site entrances, attendance days, admissions, age suitability, capacity and ethos classifications are not independently verified. Postcode centroids, timetable coverage and provider traffic assumptions still apply. No claim is made about the percentage of families served.

## Reproduce or refresh

```sh
npm run routing:expand -- 2026-10-30T08:30
npm run routing:combine
npm run preview:download
```

Use an appropriate future London date for new provider requests. Expansion checkpoints each completed result and reuses matching retained sample areas. Source files: `data/coverage-open.geojson` (individual areas), `data/coverage-combined.geojson` (two combined modes), and `reports/coverage-open.json` (counts, input coordinates, exclusions and provider outcomes). Provider calls require configured credentials/network access and may use quota or incur costs. Viewing or filtering the saved snapshot does not make provider calls.
