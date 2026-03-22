---
name: tankstelle
description: Arbeitsanweisung für Tankstellen-bezogene Änderungen im Reiseplaner: Tankstellen normalisieren, Auswahl entlang der Route pflegen und Auswirkungen auf Kosten oder Stopps modellieren.
---

# Tankstelle Skill

Nutze diesen Skill, wenn die Anfrage Tankstellen, Spritpreise, Tankstopps oder tankstellenbezogene Karten- und Sidebar-Elemente betrifft.

## Relevante Dateien
- `js/domains/tankstelle/`
- `js/services/fuel/`
- `js/services/poi/geoapify-service.js`
- `schemas/tankstelle.schema.json`

## Arbeitsweise
1. Halte Tankstellen als eigene Domäne, nicht nur als generischen POI.
2. Preise pro Liter nur anzeigen, wenn echte Werte vorhanden sind.
3. Reichweiten- oder Stopplogik getrennt von UI-Komponenten halten.
4. Änderungen an Tankkosten dürfen keine Hotel- oder Mautregeln verändern.

## Qualitätsregeln
- Unbekannte Spritpreise niemals als `0` kennzeichnen.
- Kartenmarker, Sidebar-Elemente und Budgeteffekte müssen dieselbe Datenquelle nutzen.
- Providerabhängige Logik gehört in `js/services/fuel/` oder `js/services/poi/`.
