# Location accuracy and real 45-minute coverage — 29 October 2026

## 1. Locations

All **79 full-postcode records** have been successfully resolved against Postcodes.io. Their postcode centroids and provenance are saved in `data/locations.json`, and used by the running app and downloadable HTML preview. Original CSV and normalised source records are unchanged. Coordinates now survive application restarts and deployments, rather than depending on an ignored runtime cache.

The remaining **53 records** need the full postcode of the actual site: 41 have district-level approximate coordinates, and 12 have ambiguous or incomplete locations. See `locations-needing-clarification.csv`; fill its `confirmedSitePostcode` column. These records are explicitly excluded from journey calculations. Nothing has been silently corrected (including `P03`). A postcode centroid still does not independently verify a school entrance, current site or opening status.

## 2. Real travel coverage on a sample

TravelTime successfully returned **six 45-minute arrival areas**, for driving and public transport at each of:

| Initiative | Source postcode | Area |
| --- | --- | --- |
| School 9 | DE22 1FP | Derby |
| School 23 | E7 8QT | East London |
| School 32 | G31 5JL | Glasgow |

All are marked Open in the supplied source and have resolved postcode coordinates. The sample is **arrive by 08:30, Friday 30 October 2026, Europe/London** (08:30 UTC). Areas use genuine road/timetable routing, never distance circles. Saved polygons retain holes and disconnected parts.

Twelve separate point-to-point tests through TravelTime's `/v4/time-filter` agreed with membership in the `/v4/time-map` polygons: **12 passed, 0 failed**. These include nearby and distant resolved origin postcodes for both modes. Examples from the returned diagnostic journeys:

| Diagnostic journey | Driving | Public transport |
| --- | --- | --- |
| DE55 7GL → School 9, DE22 1FP | 26 min 28 sec | Not reachable within 45 min |
| E16 1QU → School 23, E7 8QT | 15 min 2 sec | 32 min 52 sec |
| G3 7JB → School 32, G31 5JL | 10 min 47 sec | 41 min 43 sec |

These are modelled diagnostic journeys between postcode centroids, not promises about real family journeys. The other six tests used distant source postcodes and were outside coverage in both modes. Test evidence is in `routing-validation.json`; full genuine polygons are in `../data/coverage-sample.geojson`.

## Inspect the result

Open the updated downloaded HTML preview. The saved real sample is displayed initially. Switch Driving / Public transport to compare the three areas. Click a site for its postcode details; the list also works for selecting sites. Hide/show the sample using its button. The sample arrival time is fixed in the downloaded file; live recalculation remains a server operation. Data quality shows the 79 precise, 41 approximate and 12 unresolved locations.

No national coverage claim is made: only these three sites have been calculated. The next priority, if requested, is expanding and combining coverage for all eligible sites. The incomplete postcodes and inferred ethos classifications still need review.

## Repeatable commands

```sh
npm run locations:resolve
npm run routing:validate -- 2026-10-30T08:30
npm run routing:cross-check
npm run preview:download
```

Use a future London date when rerunning the routing command. Live commands require the existing routing credentials, permitted network destinations, and may use provider quota or incur costs. The cross-check command uses the date and locations recorded by the preceding validation run. Do not rerun live requests just to view the saved sample.
