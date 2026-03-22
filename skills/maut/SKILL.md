---
name: maut
description: Arbeitsanweisung für Maut-bezogene Änderungen im Reiseplaner: Mautregeln modellieren, Schätzungen kapseln und Mautkosten separat von anderen Budgetposten verwalten.
---

# Maut Skill

Nutze diesen Skill, wenn die Anfrage Maut, Vignetten, Länderregeln, Mautschätzungen oder Mautanzeige im Budget betrifft.

## Relevante Dateien
- `js/domains/maut/`
- `js/services/toll/`
- `js/features/budget/`
- `schemas/maut.schema.json`

## Arbeitsweise
1. Mautregeln als eigene Domäne behandeln.
2. Schätzlogik und echte Providerdaten strikt trennen.
3. Maut darf nicht als versteckter Nebeneffekt der allgemeinen Budgetberechnung modelliert werden.
4. Länder- oder Providerregeln gehören in kleine, klar benannte Hilfsmodule.

## Qualitätsregeln
- Herkunft der Mautdaten immer dokumentieren: Schätzung oder Provider.
- Währung und Betrag immer zusammen behandeln.
- Unbekannte Maut nicht als `0` ausgeben, wenn fachlich nur „unbekannt“ gemeint ist.
