# Garden Tracker — Blended Edition

A blended GitHub Pages garden tracker for Bella Vista, Arkansas.

This version keeps the dark visual style and plant-by-plant workflow from the existing public repo while expanding the weather briefing with:

- current temperature, feels-like, humidity, wind, and gusts
- today's high/low, precipitation chance/amount, and UV max
- sunrise, sunset, and daylight duration
- conservative last-frost countdown
- richer hardening guidance and plant-specific cold tolerance notes
- 10-day forecast bar

## File-by-file blend summary

### `index.html`
- Keeps the app-style structure and dark single-page flow.
- Adds a larger top weather briefing section before the plant detail layout.

### `css/style.css`
- Preserves the dark palette and DM Mono + Lora feel.
- Adds styling for the weather hero, richer cards, and expanded hardening table.

### `data/plants.js`
- Keeps the Bella Vista inventory and plant-specific metadata.
- Adds room constants, light schedule, permanent indoor flags, and default destinations.

### `js/app.js`
- Keeps localStorage persistence and plant-by-plant tabs.
- Expands weather calls to include current conditions, sunrise/sunset, daylight duration, UV, rain chance, and wind.
- Adds plant-specific hardening guidance and DWC water temperature logging.

## Deploying

1. Create a GitHub repo.
2. Upload the contents of this folder to the repo root.
3. In **Settings → Pages**, deploy from `main` and `/ (root)`.
4. Wait a minute and open your Pages URL.

## Notes

- Data saves in browser `localStorage`, not to GitHub.
- Export JSON backups often if you care about your log history.
- Weather is fetched from Open-Meteo on page load.


## Auto profile switching
- The hourly outdoors panel now auto-switches based on the selected plant.
- Click **Auto** to follow the selected plant's crop profile.
- Click any crop toggle to force a manual override until you switch back.


## New in v7
- destination-aware watering status with last watered / next check logic
- quick water and dry-check buttons on each plant overview
- ops queue for overdue water checks, stale DWC metrics, and stubborn old seeds
