Daniels Laser Art – Kalkulator V7 Cache-Fix

Warum V6 nicht funktionierte:
Die neue HTML-Seite wurde geladen, Chrome verwendete aber weiterhin alte Versionen von style.css und app.js.
Darum wurden alle Rechner gleichzeitig angezeigt und keine Berechnung ausgeführt.

V7 behebt das:
- CSS, JavaScript und Manifest tragen direkt ?v=7.
- Alte App-Caches und Service Worker werden einmalig entfernt.
- Die Schnellwerkzeuge werden sofort initialisiert.

UPLOAD:
Im GitHub-Ordner „Intern“ ersetzen:
- index.html
- style.css
- app.js
- manifest.json
- sw.js

Danach 1–3 Minuten warten und exakt öffnen:
https://danielslaserart.de/Intern/?v=7

Beim ersten Öffnen kann die Seite einmal kurz neu geladen werden müssen.
