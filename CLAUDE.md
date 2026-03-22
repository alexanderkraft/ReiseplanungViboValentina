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
│ Startort:      [        ] 📍│  ← leer, User tippt
│ Zielort:       [        ]   │  ← leer, User tippt
│ Ankunftsdatum: [        ] 📅│  ← leer, User waehlt
│ Personen:      [2 ▼]         │  ← generischer Default
│ Max. km/Tag:   [650 ▼] km   │  ← generischer Default
│ [🔮 Routen berechnen]        │
└─────────────────────────────┘
```

**WICHTIG: Keine hardcoded Reisedaten!** Start, Ziel und Datum starten LEER.
Nur universelle Defaults (Personen, km/Tag, Verbrauch) sind vorbelegt.
Beispiele in dieser Datei (Berlin, Sant'Agata, etc.) dienen nur der Illustration.

- Autocomplete via Google Places API (Start & Ziel)
- Kalender-Picker für Datum
- Slider für max. km/Tag
- Validierung: Route nur berechenbar wenn Start UND Ziel ausgefuellt

---

### 2. ROUTEN- & ETAPPEN-ÜBERSICHT
Beispiel (Illustration – echte Daten kommen dynamisch via OSRM + Reverse-Geocoding):
```
┌─ ROUTEN-VORSCHLÄGE (Xkm) ────┐
│ 🟢 Ausgewogen (N Etappen)     │
│   1. [Start]→[Ort A] Xkm     │
│   2. [Ort A]→[Ort B] Xkm     │
│   3. [Ort B]→[Ziel] Xkm      │
│                               │
│ 🛌 Kuerzere Tage (N+1 Etappen)│
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
POIs werden dynamisch via **Geoapify Places API** geladen (keine Fake-Daten!).
Beispiel (Illustration):
```
┌─ AUSWAHL ETAPPE 1 ──────────┐
│ 🏨 HOTELS (N ▼)             │
│   [Echtes Hotel] €XX ⭐X.X ✓│
│   [Echtes Hotel] €XX ⭐X.X  │
│                              │
│ ⛽ TANKSTELLEN (N ▼)         │
│   [Echte Tankstelle] ✓      │
│                              │
│ ☕ RESTAURANTS (N ▼)         │
│   [Echtes Restaurant] ✓     │
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
Beispiel (Illustration – echte Daten aus Geoapify):
```
┌─ [Hotel-Name] ──────────────┐
│ [HOTEL-BILD 400x300]        │
│                              │
│ 💰 €XX/Nacht (N Pers.)      │
│ ⭐ X.X (N Bewertungen)       │
│ 📍 X.Xkm von Route (+Xmin)  │
│ 🅿️ 🥐 🚗 ♿ WiFi ✓           │
│                              │
│ [Google Maps] [Booking]     │
│ [➕ Route] [♥ Favorit]      │
└─────────────────────────────┘
```

---

### 6. AUSGEWÄHLTE ITEMS ÜBERSICHT
Beispiel (Illustration – alle Werte dynamisch):
```
┌─ MEINE REISE (€XXX) ────────┐
│ Etappe 1: [Start]→[Ort A]  │
│ 🏨 [Hotel] €XX ✓            │
│ ⛽ [Tankstelle] ✓            │
│ ☕ [Restaurant] ✓            │
│ Subtotal: €XX               │
│ ─────────────────────────── │
│ Etappe 2: ...               │
│ ─────────────────────────── │
│ Gesamt: Xkm | Xh Xm        │
│ Budget: €XXX (N Pers.)      │
│ [📊 Excel] [💾 PDF] [✉️ Share]│
└─────────────────────────────┘
```

- Export: CSV/Excel, PDF, GPX
- Share-Funktion

---

### 7. ROUTEN-INFO PANEL
Beispiel (Illustration – alle Werte dynamisch berechnet):
```
┌─ ROUTE-STATUS ──────────────┐
│ 🟢 Aktuelle Route            │
│ Xkm | Xh Xmin | €XXX       │
│ 🚦 Staus (live)             │
│ 🏗️ Baustellen (live)        │
│ 📊 Verkehr: [Status]        │
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
7. **Keine reise-spezifischen Daten hardcoden** – Start, Ziel, Datum, POIs, Etappen muessen IMMER dynamisch vom User eingegeben oder via API geladen werden. Nur universelle Defaults (Personen=2, km/Tag=650, Verbrauch=7) sind erlaubt.
8. **POIs immer von echten APIs laden** – Geoapify Places API fuer Hotels, Tankstellen, Restaurants. Keine Fake-Daten oder Formeln fuer Preise/Ratings.
9. **Etappennamen per Reverse-Geocoding** – Zwischenstopps erhalten echte Ortsnamen via Nominatim, nicht generische Labels.
