# Map usability improvements — 29 October 2026

The map now provides geographical reference and readable controls in the live app and the self-contained downloaded preview. The existing 140 travel areas, arrival time, eligibility rules and exclusions are retained. No new geocoding or travel-routing requests were needed for this work.

- **88 offline place references:** 73 UK/Ireland populated-place records from Natural Earth (public domain), with 15 supplementary local labels from the existing CC0 postcode-district reference dataset. Supplementary labels are approximate place references, not initiative locations. Labels adapt to zoom, avoid one another and marker icons, and use fine reference lines when moved away from their anchor. Optional OpenStreetMap street tiles remain available when online.
- **Grouped markers:** nearby pins show a neutral numbered badge. Selecting a badge zooms in; initiatives sharing a location can fan out so each remains selectable. Cluster counts include mapped approximate locations and are separate from the count of initiatives contributing to calculated coverage. Markers and groups support keyboard selection.
- **Readable text:** filter options, postcode search, initiative details, map key, help text and data-review content have larger type and stronger contrast.
- **Clear map canvas:** driving/public transport controls remain visible above the map. Journey settings expand above the map rather than covering it. The map key is collapsed initially, and desktop filters can be hidden. Initiative details are docked beside the map on desktop and below it on narrow screens.
- **Expanded map view:** Expand map uses the available viewport; Exit full map or Escape restores the normal layout and previous page position.
- **Accessible controls:** icon-only buttons retain names on mobile; mode buttons report their pressed state; collapse controls report their expanded state.

Browser checks cover offline labels, hidden settings, label toggling, desktop filter collapse, expanded-map exit, docking bounds, readable detail text, keyboard access to co-located initiatives, mobile overflow and all existing coverage/filter/export behavior. The normal coverage, geometry and authentication checks remain in place.

Place sources are retained in `data/places.json`. Natural Earth source: `ne_10m_populated_places_simple.geojson`. Supplementary references: Gibbs/uk-postcodes district centroids, with the CC0 licence retained in `data/POSTCODE-LICENSE.txt`. These references do not alter postcode coordinates or travel geometry.
