---
name: poi
description: Arbeitsanweisung für allgemeine POI-bezogene Änderungen im Reiseplaner: Places laden, normalisieren, filtern, gruppieren und in Karte oder Sidebar darstellen.
---

# POI Skill

Nutze diesen Skill, wenn die Anfrage Restaurants, Sehenswürdigkeiten, allgemeine Stops, Kartenmarker, Filter oder Places-Listen betrifft.

## Relevante Dateien
- `js/domains/poi/`
- `js/services/poi/geoapify-service.js`
- `js/features/route-planner/`
- `schemas/poi.schema.json`

## Arbeitsweise
1. Allgemeine Places-Logik bleibt generisch und wiederverwendbar.
2. Hotels und Tankstellen sind Spezialisierungen und sollen nicht in generische POI-Modelle gepresst werden.
3. Filter- und Gruppierungsregeln nahe an der Domain halten.
4. Karten-Rendering und Datenanreicherung getrennt pflegen.

## Qualitätsregeln
- Kategorie muss immer explizit gesetzt sein.
- Unvollständige Places dürfen dargestellt werden, aber mit klarer Kennzeichnung fehlender Daten.
- Keine UI-spezifischen HTML-Fragmente in Adaptern erzeugen.
