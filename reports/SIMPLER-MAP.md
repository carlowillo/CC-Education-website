# Simpler map interface — 23 November 2026

The headline, vision statement, footer copy, browser title and map description now use **Christ-centred education**. The Christian Concern Education organisation name and the existing ethos classifications retain their source wording.

The default map has one toolbar with filter visibility, postcode search and the selected-initiative count. Driving/public transport controls are in the bottom bar. The arrival-time badge, eligible/estimated/excluded-site summary, top-right initiative-list/data-quality controls and technical map caption have been removed. The repeated sidebar count and three-part statistics row have been replaced with one clear purple number in the top toolbar, labelled “initiatives selected”. It updates with the filters, including zero-result selections. It represents matching records, not admissions vacancies or journey-area totals.

Optional tools remain accessible from the footer: Map settings, Initiative list, Review the data and Coverage details. Calculation times and estimate inclusion are inside the optional settings panel. Opening the list or settings moves the view to the relevant controls. Individual initiative details, the optional legend, postcode results and detailed methodology continue to explain estimated locations. The broad estimated-site information bar is absent from the default view.

Actual calculation failures or incomplete coverage still produce a concise conditional message. Saved routing data and eligibility rules are retained; no additional routing/geocoding request was needed for this interface change. The standalone preview no longer adds a second technical count/status strip beneath the page footer.

Existing browser checks have been adapted to verify the single purple count, absence of the removed bars/buttons, optional tool access, filters, real coverage layers, postcode matches, exports and mobile/docked detail layouts.

Validation: the production build, 23 automated checks and 13 Chromium browser checks pass. Desktop/mobile images of the regenerated standalone preview were reviewed; 320, 390, 768, 1280 and 1440px widths have no horizontal overflow. The desktop travel-mode bar meets the bottom edge of the map panel. The standalone HTML is tested unchanged through a local fixture because managed Chromium blocks direct file URLs.

Layout follow-up: the purple selected-initiative count now occupies the top toolbar, and the driving/public transport switch occupies the bottom bar. The production build and four relevant browser checks pass; refreshed desktop/mobile images were reviewed, with no horizontal overflow at 320, 390, 768, 1280 or 1440px.
