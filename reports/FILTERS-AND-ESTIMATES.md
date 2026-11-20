# Filter counts, stage colours and estimated locations — 20 November 2026

Filter counts now apply selections in every other group. Multiple options within a group use OR; different groups use AND. For example, Strong Christian ethos produces 17 Open and 17 Full-Time school records, with zero developing stages. The count beside an option deliberately ignores selections in its own group, allowing users to see alternative choices. Selected options remain removable at zero matches. Reset restores the default Open view.

The map uses purple for Open, orange for development and slate for unrecorded stages. Cluster rings show the stage composition. List pins, details and travel areas share the key. Ethos remains a filter and a provisional detail badge. Selecting other stages includes their available coverage automatically, without an additional planned-stage switch. Developing and unrecorded provision are scenarios, not current provision.

All 53 incomplete locations received real, current representative postcodes from Postcodes.io. For district entries, a postcode close to the returned district centroid and inside that same district was chosen. Broad postcode areas and town descriptions use an explicitly stated central reference district. P03 is explicitly assumed to mean PO3; source P03 is preserved. Every estimate has its own basis, representative postcode and source value in `data/estimated-locations.json` and `reports/estimated-locations.csv`. Original CSV/JSON values and the 79 full-postcode locations remain unchanged. Representative postcodes are not asserted to be school addresses.

Estimated routing is enabled by default and can be excluded in Journey settings. Estimate pins have dashed borders. Any returned estimate areas use dashed boundaries and lighter fill. Polygons are combined separately by development stage and location quality; exports preserve both labels. Postcode results break down open/developing/unrecorded matches and explicitly count estimated matches. The downloaded preview now supports offline lookup of saved initiative and representative postcodes; other postcode lookups require internet access to Postcodes.io.

## Provider calculation completed

The owner explicitly approved sending initiative coordinates, including estimates, and anonymised IDs to TravelTime on 20 November 2026. All 264 provider areas are now saved for all 132 initiatives, with one arrival time: Monday 23 November 2026, 08:30 London time. There are 79 source full-postcode locations and 53 representative-location estimates; the default Open view includes 90 records, of which 20 are estimates. Developing and unrecorded stages remain future scenarios, not current provision.

An initial provider rate limit interrupted the run after 187 areas. Those checkpoints were reused, calls were slowed to fewer than 20 per minute, and all remaining areas completed without failures. No website, ethos, affiliation or support fields were sent. Ten precomputed stage/location-quality unions support both modes. The original 45-minute duration is retained. See [the coverage report](PLANNING-COVERAGE.md) for inputs and validation.

To refresh the saved snapshot, run `npm run routing:planning -- YYYY-MM-DDTHH:MM`, `npm run routing:planning:combine`, and `npm run preview:download`. Use a future London arrival time. Partial or failed results must remain visible; estimates must never be promoted to confirmed school addresses.

## Validation

The production build, **23 automated checks** and **13 Chromium browser checks** pass.

Automated and browser checks cover the refreshed real planning snapshot as well as the earlier filter changes. Checks cover actual-data facet totals and intersections, multiple selections, zero-count deselection, reset, estimate provenance and opt-out, stage-coloured areas, postcode match labels, CSV/GeoJSON exports, offline representative-postcode lookup, online postcode lookup with a mocked service, existing mode/filter coverage, keyboard marker selection, protected APIs and mobile layout. UI fixtures remain clearly separated from saved real provider data; additional checks validate real estimate-area postcode membership, stage selection and opt-out. The standalone HTML is served unchanged as a local fixture because managed Chromium blocks direct file URLs. The current snapshot consists of genuine TravelTime results, including provider-calculated areas around the explicitly estimated reference postcodes.
