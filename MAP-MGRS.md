# World map and MGRS

The map remains MapLibre/OpenFreeMap and is styled as a dark map workspace.
The default base map is dark; an existing saved base-map preference is respected.
The sidebar offers base maps, saved-marker visibility, weather-panel visibility,
place search, MGRS search, selected coordinates and saved places. Fullscreen uses
the browser API, with an expandable fallback and Escape to exit. Attribution is
retained. No Osiris embedding, feeds or account integration is involved.

MGRS calculations run in the browser using vendored `mgrs` 2.2.0, with the MIT
and OpenMap notices beside the bundle. Source/API documentation:
https://github.com/proj4js/mgrs

The primary display and copy action use MGRS. WGS84 is displayed separately.
Search accepts lowercase, whitespace and equal-length easting/northing digits.
The map opens the center of the specified grid cell. Five digits on each axis
describe a one-meter cell; this is not a statement of source-data accuracy.
This implementation supports UTM-based MGRS from 80 degrees south to 84 degrees
north; polar UPS is not implemented. Polar points retain a WGS84 display and
can still be added to the form; the MGRS copy action is disabled there.

Existing WGS84 work-point strings and new MGRS work-point strings are both read.
No historic data is converted, no schema migration is needed, and authentication
and role policies are unchanged. New points transferred from the map populate
the work-location field with MGRS where supported. Weather requests use WGS84
and the existing Open-Meteo data path. This is a world map, not a georeferenced
game-island map. Wind/rain overlays, live tracking and an MGRS grid overlay are
not implemented; weather is a forecast card for the selected location.

Validation: `node tests/map-mgrs.cjs` uses upstream reference vectors and tests
invalid inputs, round trips, both coordinate formats, copy, form transfer,
marker visibility, map styles, fullscreen and 360/768/1440px layouts with local
fixtures. Set `MAP_REAL=1` for optional live MapLibre/OpenFreeMap rendering at
public demonstration coordinates; weather, auth and database calls stay mocked.
`QA_SCREENSHOT_DIR` optionally saves screenshots of the real map render.
The PR CI runs the deterministic fixture-based test without production secrets.
