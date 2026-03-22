# AGENTS.md

## Ziel
Dieses Repository enthält einen GitHub-Pages-kompatiblen Reiseplaner für europäische Autoreisen.

## Architekturprinzip
Die Entwicklung folgt einer domänenorientierten Struktur:
- `js/core/` für wiederverwendbare Basislogik
- `js/services/` für externe APIs und Provider
- `js/features/` für Benutzerflüsse und UI-Controller
- `js/domains/` für Fachlogik pro Geschäftsbereich
- `schemas/` für Datenverträge
- `skills/` für KI-Arbeitsanweisungen pro Domäne

## Bestehende Einstiegspunkte
- `index.html` bleibt Kompositions- und Layout-Datei.
- `css/style.css` bleibt globaler Einstieg für Styles.
- `js/app.js` bleibt Bootstrap-/Orchestrierungsdatei.
- Neue Fachlogik soll nicht direkt in diese Dateien geschrieben werden, wenn ein passender Modulordner existiert.

## Regeln für KI-Agenten
1. Arbeite bevorzugt in dem kleinsten fachlich passenden Ordner.
2. Mische keine API-Integrationslogik mit UI-Darstellung.
3. Mische keine Budgetregeln mit Karten- oder DOM-Logik.
4. Ergänze neue Felder zuerst in `schemas/*.json`, dann in Adaptern und Views.
5. Kennzeichne Echtwerte, Schätzwerte und unbekannte Werte getrennt.
6. Lege neue domänenspezifische Regeln unter `js/domains/<name>/` ab.
7. Lege neue API-Integrationen unter `js/services/<name>/` ab.
8. Halte Skills knapp; Detailwissen gehört in `references/`, nicht in endlose Skill-Dateien.

## Domänenzuordnung
- Hotel: `js/domains/hotel/`, `skills/hotel/`, `schemas/hotel.schema.json`
- Tankstelle: `js/domains/tankstelle/`, `skills/tankstelle/`, `schemas/tankstelle.schema.json`
- POI: `js/domains/poi/`, `skills/poi/`, `schemas/poi.schema.json`
- Maut: `js/domains/maut/`, `skills/maut/`, `schemas/maut.schema.json`

## Tests und Qualität
- Für neue Datenformen sind Schema-/Fixture-Dateien zu ergänzen.
- Für neue Benutzerflüsse sollen mindestens Smoke-Checks oder dokumentierte manuelle Checks ergänzt werden.
- Wenn ein Modul nur als Struktur- oder Planungsstub angelegt wird, muss das im Dateikommentar klar erwähnt werden.
