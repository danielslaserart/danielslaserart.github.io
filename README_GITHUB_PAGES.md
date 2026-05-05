# Daniels Laser Art – GitHub Pages Ready

Diese ZIP ist für GitHub Pages vorbereitet.

## Upload-Struktur
Die Dateien liegen bereits richtig:

- `index.html`, `shop.html`, `galerie.html`, Rechtliches usw. im Root
- CSS unter `assets/css/` und `assets/css/pages/`
- JavaScript unter `assets/js/`
- Daten unter `assets/data/`
- Bilder unter `assets/images/`

## Versteckter Shop
Der Shop ist unter `shop.html` vorhanden, aber aktuell versteckt:

- kein Shop-Link in der Startseiten-Navigation
- `shop.html` enthält `noindex, nofollow`
- `robots.txt` blockiert `/shop.html`

Direkter Test-Link nach Upload:

`https://danielslaserart.de/shop.html`

## Shop später sichtbar machen
1. In `index.html` im Menü ergänzen:

```html
<a href="shop.html">Shop</a>
```

2. In `shop.html` entfernen:

```html
<meta name="robots" content="noindex, nofollow" />
```

3. In `robots.txt` entfernen:

```txt
Disallow: /shop.html
```

4. Optional `shop.html` in `sitemap.xml` aufnehmen.
