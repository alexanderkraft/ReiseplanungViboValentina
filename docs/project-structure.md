# Projektstruktur für domänenorientierte KI-Arbeit

Diese Struktur ist das Zielbild für die Weiterentwicklung des Reiseplaners. Sie trennt klar zwischen `core`, `services`, `features` und `domains`, damit KI-Agents und Skills gezielt in kleinen Bereichen arbeiten können.

## Zielstruktur

```text
ReiseplanungViboValentina/
├── index.html
├── AGENTS.md
├── README.md
├── CLAUDE.md
├── css/
│   ├── style.css
│   ├── tokens.css
│   ├── layout.css
│   ├── components.css
│   └── features/
│       ├── route-planner.css
│       ├── hotel.css
│       ├── tankstelle.css
│       ├── poi.css
│       └── maut.css
├── js/
│   ├── app.js
│   ├── core/
│   │   ├── constants.js
│   │   ├── events.js
│   │   ├── state.js
│   │   ├── storage.js
│   │   └── utils/
│   │       ├── dom.js
│   │       ├── format.js
│   │       ├── geo.js
│   │       └── validate.js
│   ├── services/
│   │   ├── geocoding/nominatim-service.js
│   │   ├── poi/geoapify-service.js
│   │   ├── routing/osrm-service.js
│   │   ├── fuel/fuel-service.js
│   │   └── toll/toll-service.js
│   ├── features/
│   │   ├── trip-input/trip-input-controller.js
│   │   ├── route-planner/route-controller.js
│   │   ├── budget/budget-controller.js
│   │   ├── exports/export-controller.js
│   │   └── selected-trip/selected-trip-controller.js
│   └── domains/
│       ├── hotel/
│       │   ├── hotel-model.js
│       │   ├── hotel-adapter.js
│       │   └── hotel-budget.js
│       ├── tankstelle/
│       │   ├── tankstelle-model.js
│       │   ├── tankstelle-adapter.js
│       │   └── tankstelle-budget.js
│       ├── poi/
│       │   ├── poi-model.js
│       │   └── poi-adapter.js
│       └── maut/
│           ├── maut-model.js
│           └── maut-estimator.js
├── schemas/
│   ├── trip.schema.json
│   ├── hotel.schema.json
│   ├── tankstelle.schema.json
│   ├── poi.schema.json
│   └── maut.schema.json
├── skills/
│   ├── hotel/SKILL.md
│   ├── tankstelle/SKILL.md
│   ├── poi/SKILL.md
│   └── maut/SKILL.md
└── tests/
    ├── contracts/.gitkeep
    ├── fixtures/.gitkeep
    └── smoke/.gitkeep
```

## Ebenen der Architektur

### `js/core/`
Globale, wiederverwendbare Basisbausteine.
- `state.js`: zentraler App-State
- `storage.js`: Persistenz in `localStorage`
- `events.js`: Event-Namen / Event-Bus-Helfer
- `constants.js`: Defaults und UI-Konstanten
- `utils/*`: kleine, fachneutrale Hilfsfunktionen

### `js/services/`
Technische Integrationen zu externen APIs.
- `routing/osrm-service.js`: Route und Alternativrouten
- `geocoding/nominatim-service.js`: Vorwärts-/Reverse-Geocoding
- `poi/geoapify-service.js`: Places-Abfragen
- `fuel/fuel-service.js`: Spritpreis-/Tanklogik
- `toll/toll-service.js`: Mautdaten / Provideradapter

### `js/features/`
Benutzerflüsse und UI-orientierte Controller.
- `trip-input`: Eingabephase
- `route-planner`: Routenwahl und Etappensteuerung
- `budget`: Budgetanzeige und Berechnung
- `exports`: CSV / JSON / später PDF / GPX / Share
- `selected-trip`: Überblick der gewählten Reiseelemente

### `js/domains/`
Fachlogik je Skill / Business-Domain.
- `hotel`: Hotelnormalisierung, Auswahl, Budgeteffekte
- `tankstelle`: Tankstellenmodell, Auswahl, Budgeteffekte
- `poi`: generische Places und Filterregeln
- `maut`: Länderregeln, Schätzer, spätere Provider-Integration

### `schemas/`
Verbindliche Datenverträge für Skills und Module.

### `skills/`
Agenten-/Skill-spezifische Arbeitsanweisungen je Domäne.

## Migrationsregel

Die bestehenden Einstiegspunkte `index.html`, `css/style.css` und `js/app.js` bleiben vorerst erhalten. Neue Logik soll aber nur noch in den dafür vorgesehenen Unterordnern angelegt und von dort aus eingebunden werden.
