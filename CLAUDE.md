# CLAUDE.md – Bindende Entwicklungsrichtlinien

> **WICHTIG:** Diese Datei enthält die verbindlichen Anforderungen für den GitHub Pages Reiseplaner.
> Claude MUSS diese Specs bei jeder Änderung einhalten. Abweichungen nur nach expliziter Freigabe durch den User.

---

## Tech Stack (FEST – nicht ändern ohne Absprache)

```
Frontend:  HTML / CSS / JS Vanilla (kein Framework)
Karte:     Leaflet.js + OSRM API (kein Google Maps)
Deploy:    GitHub Pages (main branch)
Files:     index.html | css/style.css | js/app.js
```

### APIs

| API | Zweck | Kosten |
|-----|-------|--------|
| OSRM (`router.project-osrm.org`) | Routing & Etappenberechnung | Free |
| Google Places API | Autocomplete (Start/Ziel) | Key erforderlich |
| Geoapify | POIs (Hotels, Restaurants, Sehenswürdigkeiten) | Free Tier |
| Clever-Tanken | Aktuelle Spritpreise | Free |
| Leaflet Traffic Tiles | Staus / Baustellen | Free |

**Regel für API Keys:** Niemals im Repo einchecken. Immer via `js/config.js` (in `.gitignore`).

---

## Feature-Anforderungen

### 1. INPUT PHASE

```
┌─ REISE-EINGABE ─────────────┐
│ Startort:      [Berlin ▼] 📍│
│ Zielort:       [Sant'Agata ▼]│
│ Ankunftsdatum: [13.08.2026] 📅│
│ Personen:      [2 ▼]         │
│ Max. km/Tag:   [650 ▼] km   │
│ [🔮 Routen berechnen]        │
└─────────────────────────────┘
```

- Autocomplete via Google Places API (Start & Ziel)
- Kalender-Picker für Datum
- Slider für max. km/Tag

---

### 2. ROUTEN- & ETAPPEN-ÜBERSICHT

```
┌─ ROUTEN-VORSCHLÄGE (1.950km) ─┐
│ 🟢 Standard (3 Etappen)       │
│   1. Berlin→Innsbruck 525km   │
│   2. Innsbruck→Bologna 650km  │
│   3. Bologna→Sant'Agata 775km │
│                               │
│ 🔵 Budget (3 Etappen)        │
│ 🟡 Komfort (4 Etappen)       │
│ [👆 Ziehe Etappen] [➕ Stopp] │
└───────────────────────────────┘
```

- Drag & Drop: Etappenreihenfolge/-position ändern
- Slider: km pro Etappe anpassen
- ➕ Button: Zwischenstopps hinzufügen
- 3 Routenvarianten: Standard / Budget / Komfort

---

### 3. INTERAKTIVE KARTE

```
🗺️ Leaflet + OSRM Routing
├── Blaue Linie: Haupt-Route (KM/Zeit live)
├── Drag Marker: Etappen verschieben
├── Zoom zu ausgewählter Etappe
├── Traffic Layer: Staus/Baustellen
└── POI Marker: Hotels ⛽ 🏨 🍽️ 🏞️
```

- Etappe drag → Live OSRM re-route
- Stopp add → Neue Etappen teilen
- Long-Press Karte → Neuer Stopp

---

### 4. INTERAKTIVE AUSWAHL-SIDEBAR

```
┌─ AUSWAHL ETAPPE 1 ──────────┐
│ 🏨 HOTELS (Innsbruck 12 ▼)  │
│   Pension Rose €70 ⭐4.3 ✓  │
│   Hotel Brenner €95 ⭐4.1   │
│                              │
│ ⛽ TANKS (5 ▼)               │
│   OMV A12 1.74€ ✓           │
│   Aral Innsbruck 1.78€      │
│                              │
│ 🍽️ RESTAURANTS (8 ▼)        │
│   Trattoria €25pp ⭐4.5 ✓   │
│                              │
│ 🏞️ POIs (15 ▼)              │
│   Brennerpass FREE ✓        │
│ [🔍 Filter: Preis ▼]         │
└─────────────────────────────┘
```

Klick-Effekte:
- Grüner Marker auf Karte
- Zum Route hinzufügen
- Preis zum Budget addieren
- Google Maps Link anzeigen

---

### 5. DETAIL-INFO MODAL

```
┌─ Pension Rose ──────────────┐
│ [HOTEL-BILD 400x300]        │
│                              │
│ 💰 €70/Nacht (2 Pers.)      │
│ ⭐ 4.3 (128 Bewertungen)     │
│ 📍 2.3km von Route (+3min)  │
│ 🅿️ 🥐 🚗 ♿ WiFi ✓           │
│                              │
│ "Gemütlich, familiengeführt"│
│ [Google Maps] [Booking]     │
│ [➕ Route] [♥ Favorit]      │
└─────────────────────────────┘
```

---

### 6. AUSGEWÄHLTE ITEMS ÜBERSICHT

```
┌─ MEINE REISE (€892) ────────┐
│ Etappe 1: Berlin→Innsbruck  │
│ 🏨 Pension Rose €70 ✓       │
│ ⛽ OMV Tank 1.74€ €12 ✓     │
│ 🏞️ Brennerpass FREE ✓       │
│ Subtotal: €82               │
│ ─────────────────────────── │
│ Etappe 2: ...               │
│ ─────────────────────────── │
│ Gesamt: 1.950km | 21h 15m   │
│ Budget: €892 (2 Pers.)      │
│ [📊 Excel] [💾 PDF] [✉️ Share]│
└─────────────────────────────┘
```

- Export: CSV/Excel, PDF, GPX
- Share-Funktion

---

### 7. ROUTEN-INFO PANEL

```
┌─ ROUTE-STATUS ──────────────┐
│ 🟢 Standard Route            │
│ 1.950km | 21h 15min | €180  │
│ 🚦 2 Staus (+22min)         │
│ 🏗️ 1 Baustelle A12          │
│ 📊 Verkehr: Mittel 🟡        │
│                              │
│ [Google Maps Link]          │
│ [Waze] [OSM] [Export GPX]   │
└─────────────────────────────┘
```

---

## UI/UX Flows

```
1. Input → [Berechnen] → Routen-Karten
2. Route wählen → Sidebar öffnet
3. Items auswählen → Karte + Budget updaten
4. Drag Etappen → Live re-calc
5. [Fertig] → Übersicht + Export
```

---

## Mobile (Mobile-First!)

- Sidebar → Bottom Sheet
- Swipe zwischen Etappen
- Touch-Drag für Etappen
- Collapse/Expand Items

---

## Interaktions-Patterns

| Geste | Aktion |
|-------|--------|
| 👆 Klick Item | Detail-Modal + Marker auf Karte |
| ✋ Drag Etappe | Live OSRM Update |
| 🔍 Suche/Filter | In Sidebar filtern |
| 📍 Long-Press Karte | Neuer Stopp hinzufügen |
| 💾 Save/Load | localStorage Persistenz |

---

## Entwicklungsregeln

1. **Immer nach dieser Struktur bauen** – keine Abweichung ohne User-Freigabe
2. **GitHub Pages kompatibel** – kein Server-Side Code
3. **Mobile-First** – jede Komponente zuerst für Mobile entwerfen
4. **API Keys niemals ins Repo** – immer `js/config.js` + `.gitignore`
5. **Leaflet bleibt die Kartenbibliothek** – kein Wechsel zu Google Maps
6. **OSRM bleibt der Router** – kostenlos, kein API Key nötig
