# Updated school dataset — 25 November 2026

Source: user-supplied **20261023 Data for Map - Schools Renamed.xlsx**, Sheet1. The original file is retained verbatim as `data/initiatives-source.xlsx`; its SHA-256 and complete old/new name mapping are in [dataset-update.json](dataset-update.json).

## Comparison and import

- 132 populated records and seven columns, with no blank or duplicate initiative names.
- All 132 names differ from the prior anonymised names. Names follow the workbook, with surrounding/repeated whitespace normalised. The 42 “School Name in Progress” placeholders remain exactly as supplied apart from whitespace.
- The other six columns match the previous CSV at every row after whitespace normalisation: postcode, website, connected organisation, support, provision and stage. Existing stable IDs are therefore retained; no location, classification or stage has been changed.
- The normalised JSON, CSV representation, current location-review reports and source notes use the updated names. Spreadsheet content is data, not instructions. No formulas or external links were evaluated; no formula cells were present.

## Saved coverage and privacy

The same 79 source full-postcode locations, 53 labelled representative estimates, 90 Open initiatives and 264 genuine saved TravelTime areas remain. No new geocoding or routing requests are required for a name-only update. The saved arrival stays 23 November 2026, 08:30 London time.

Current names are joined to provider features by stable initiative ID when loading retained coverage, historical sample coverage or cached live coverage. The original provider geometry and historical validation files remain unchanged. The Vercel payload and offline preview are regenerated, so map labels, postcode matches, details and per-initiative coverage exports use the new names. Stage unions contain IDs rather than names and do not need recalculation.

The shared password gate remains mandatory on Vercel. The supplied workbook is excluded from Vercel upload/function packaging. The standalone offline preview still contains internal data and should remain in the private repository or with authorised colleagues.

## Verification

Source comparison verified all 132 names and the six unchanged columns. An additional retained-coverage regression verifies current names and unchanged geometry/properties for all 264 areas. Protected Vercel transport checks compare every decoded coverage name with the current initiatives API. Existing browser checks now use the updated school names and verify renamed postcode matches and initiative details in the hosted app and offline preview.

- `npm run vercel-build`: passes.
- `npm test`: all 27 checks pass.
- Browser regression suite: all 13 desktop/mobile/offline checks pass.
- Official Vercel Node builder: produces the protected Node 24.x function successfully.
- Compiled function smoke check: authentication, 132 current names, 264 saved coverage names and six historical sample labels pass; source XLSX excluded from the function.
- Workbook/CSV/JSON comparison: all 132 names agree; every non-name JSON field and the precise/estimated coordinate and provider-geometry files match the previous commit.
- `git diff --check`: passes. CSV representations use LF line endings and trim surrounding cell whitespace; the original XLSX remains verbatim.
