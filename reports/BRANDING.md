# Christian Concern Education styling — 20 November 2026

The app and downloadable preview have been restyled from the owner's three reference screenshots of the Christian Concern Education website. Reference page: https://education.christianconcern.com/schools/christ-centred-schools/.

The design includes a navy masthead, Christian Concern / Education wordmark treatment, cream headline highlights, red statement band, serif introductory copy, locally bundled Montserrat interface type, square purple buttons, and a navy footer. Filters, journey controls, dialogs, lists, detail cards, statistics, search results and map controls share the new palette. Page titles and browser theme colour now identify Christian Concern Education.

The stage key uses purple for Open, orange for development and slate for unrecorded stages. Pins, cluster rings, travel areas and list/detail badges follow this key. Estimated locations remain distinct with dashed styling. The 264 saved provider areas, source data, estimates and coverage rules were retained without new routing requests.

Core appearance is in `src/branding.css`; shared stage colours are in `src/types.ts`. `src/BrandMark.tsx` is a **typographic recreation**, not the original logo artwork. The environment's network policy returned HTTP CONNECT 403 for the supplied site, so its original logo files and CSS could not be retrieved. Colour values and font choices are visual matches to the screenshots, not independently verified official brand specifications. Montserrat is bundled through Fontsource; explanatory prose uses the system Georgia / Times serif stack. The original logo and official font values can replace these once those assets are accessible.

Montserrat's SIL Open Font License is retained in `public/brand/MONTSERRAT-LICENSE.txt`, copied into the production build and embedded in the standalone HTML. Viewing the branding needs no external font or image service. Existing parent-site navigation has been adapted to working map, vision and data controls. The internal workspace label remains visible.

Desktop and mobile screenshots were inspected; viewport checks at 320, 390, 768, 1280 and 1440 pixels found no horizontal overflow. Existing functional and browser checks cover the brand update alongside filter counts, stage/estimate coverage, postcode matches, exports, docked details, mobile controls and protected APIs.

Validation: production build, 23 automated checks and 13 Chromium browser checks pass. The browser suite uses both the live app and the unchanged standalone HTML via a local fixture; direct file URLs are blocked by managed Chromium policy.
