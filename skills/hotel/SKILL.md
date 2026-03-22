---
name: hotel
description: Arbeitsanweisung für Hotel-bezogene Änderungen im Reiseplaner: Hoteldaten normalisieren, Hotelauswahl darstellen, Budgeteffekte berechnen und hotelrelevante UI-Flows umsetzen.
---

# Hotel Skill

Nutze diesen Skill, wenn die Anfrage Hotels, Übernachtungen, Hotelbudget, Hotellisten oder Hotel-Details betrifft.

## Relevante Dateien
- `js/domains/hotel/`
- `js/services/poi/geoapify-service.js`
- `js/features/selected-trip/`
- `schemas/hotel.schema.json`

## Arbeitsweise
1. Prüfe zuerst, ob die Änderung reine Datenlogik, reine UI-Logik oder beides betrifft.
2. Datenmapping und Normalisierung gehören in `hotel-adapter.js`.
3. Budgetlogik gehört in `hotel-budget.js`.
4. Rohdaten aus APIs dürfen nie ungeprüft direkt in die UI geschrieben werden.
5. Unbekannte Preise oder Ratings müssen als unbekannt behandelt werden, nicht als `0`.

## Qualitätsregeln
- Trenne Echtwerte von Schätzwerten.
- Hotelkosten müssen pro ausgewähltem Eintrag nachvollziehbar sein.
- Externe Hotel-Links nur rendern, wenn belastbare URLs vorliegen.
