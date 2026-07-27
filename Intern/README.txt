Daniels Laser Art Kalkulator V4.12.1

CHANGELOG 4.x

4.12.1 – Rechner-Start und Datenladen korrigiert
- Startfehler „source is not defined“ beim Öffnen des Rechners behoben.
- Neue Kalkulationen starten zuverlässig mit Auftragstyp „Eigenes Produkt“.
- Kundenobjekt-Bearbeitung wird bei neuen Kalkulationen auf „Gravieren“ zurückgesetzt.
- Bearbeitungs-ID, Verbrauchsmaterialien, Produktgröße und Timer werden sauber zurückgesetzt.
- Bestehende Projekte und Vorlagen laden Auftragstyp und Bearbeitungsmodus weiterhin aus ihren gespeicherten Quelldaten.

4.12.0 – Universeller Auftragsassistent und Kundenobjekte
- Neuer Auftragseinstieg: Eigenes Produkt, Kundenobjekt oder Dienstleistung ohne Material.
- Kundenobjekte unterstützen Gravieren, Schneiden und beide Bearbeitungsarten.
- Keine Materialfelder und garantiert 0,00 € Materialkosten bei Kundenobjekten.
- Grundpauschale, Maschinenzeit, Arbeitszeit, Schwierigkeit, Risiko und Mindestpreis in derselben Preis-Engine.
- Automatischer, manuell überschreibbarer Risikoaufschlag anhand des Objektwerts.
- Frei änderbare Grundpauschale, Mindestpreis-, Risiko- und Schwierigkeitswerte.
- Transparente Preisaufschlüsselung einschließlich berechnetem und empfohlenem Preis.
- Auftragstyp-Badges in der Projektübersicht und zusätzliche Kundenobjekt-Kennzahlen.
- Eigenprodukte und Kundenobjekte werden im Lernsystem getrennt verglichen.
- Bestehende Projekte werden vorsichtig als Eigenprodukte migriert; erkannte Kundenobjekte bleiben entsprechend gekennzeichnet.

4.11.1 – Lernbereich und Referenzprojekt-Details
- Lernen als eigener Hauptbereich in die untere Navigation aufgenommen und vollständig von den Systemeinstellungen getrennt.
- Neue hochwertige Lern-Kacheln für Referenzprojekte, Erfahrungswerte, Lernstatistik und Kalibrierung.
- Referenzprojekt-Karten mobil neu aufgebaut: Bild oben, kompakte Kerndaten und klare Aktionen ohne Überlauf.
- Neuer, deutlich hervorgehobener Ansehen-Button vor Bearbeiten.
- Vollständige Referenzprojekt-Detailansicht mit Bild, Kalkulations-, Ist-, Kosten-, Gewinn- und Lernwerten.
- Detailaktionen: Bearbeiten, Duplizieren, als echtes Projekt übernehmen, Lernstatus ändern und Löschen.
- Klare Zurück-Navigation, korrekter aktiver Lern-Navigationspunkt und Erhalt der Listen-Scrollposition.
- Eigene Lernstatistik mit Zeit-/Preisabweichung und Lernfortschritt.

4.11.0 – Bedienung, Referenzen und Erfahrungswerte
- Materialkosten werden direkt unter dem Materialverbrauch angezeigt und verwenden exakt denselben Wert wie die Selbstkosten.
- Eigene, sichtbare Bereiche für Referenzprojekte und Erfahrungswerte ergänzt.
- Referenzen vollständig anzeigen, bearbeiten, löschen, duplizieren, konvertieren und vom Lernsystem ausschließen.
- Erfahrungswerte suchen, filtern, sortieren und bearbeiten; Zeit-/Preisabweichungsstatistik ergänzt.
- Ist- und Schätzwerte im Datenmodell getrennt; unbekannte Ist-Werte werden als null migriert.
- Rechner beginnen beim erneuten Öffnen leer und besitzen eine sichtbare Aktion „Neue Kalkulation“.
- Speicher-Rückfrage für eine neue Kalkulation ergänzt.
- Native Browser-Dialoge durch Dialogfenster im App-Design ersetzt.
- Sichtbare Systemnavigation zu Kundenprojekten, Referenzen, Erfahrungswerten, Lernstatistik und Kalibrierung.
- Service-Worker-Cache, Manifest und sichtbare Version aktualisiert.

4.10.1 – Referenzdaten und Kundenprojekte getrennt
- Eindeutige Datentypen: recordType "project" und "reference".
- Schätzungen werden nicht mehr automatisch als Kundenprojekt gespeichert.
- Getrennte Aktionen „Als Referenz speichern“ und „Als Projekt übernehmen“.
- Bei der Projektübernahme ist der tatsächlich vereinbarte Verkaufspreis Pflicht.
- estimatedPrice und actualPrice werden getrennt gespeichert.
- Referenzdaten zählen nicht zu Umsatz, Gewinn, Projektanzahl, offenen oder letzten Projekten.
- Preislernen verwendet ausschließlich actualPrice; reine Schätzpreise werden ignoriert.
- Zeitlernen verwendet ausschließlich vorhandene Ist-Zeiten.
- Migration: Eindeutig vom alten Assistenten erzeugte Einträge werden als Referenz markiert. Unklare Altdaten bleiben zur Sicherheit echte Projekte. Keine Daten werden automatisch gelöscht.

4.0.1 – Angebotsassistent
- Gewinn in Euro und Prozent
- Preisstufen Minimal, Optimal und Premium
- Übergabe an den Preisrechner
- Angebot direkt als Projekt speichern

4.0.2 – Lernsystem
- Neue Datei js/learning.js
- Vergleich echter Referenzprojekte nach Material, Maschine, Fläche, Detailgrad und Bearbeitung
- Erfahrungswerte beeinflussen kommende Zeitschätzungen automatisch

4.0.3 – Referenzprojekte
- Projekte als Referenz markieren, anzeigen, bearbeiten und löschen

4.1.0 – Dashboard
- Umsatz heute und Monat, Gewinn, offene Projekte und Materialwarnungen
- Schnellstart für den Angebotsassistenten

4.2.0 – Materialverwaltung
- Hersteller, Farbe, Lagerplatz, Verkaufspreis, Rest- und Mindestbestand sowie QR-Kennung

4.3.0 – Maschinenprofile
- Bild, Arbeitsfläche, Wartungsintervall, letzte Wartung und Betriebsstunden

4.4.0 – Projektverwaltung
- Status Angebot, In Arbeit, Wartet, Fertig und Abgerechnet
- Projektkosten, Gewinn, Bilder und Notizen bleiben vollständig erhalten

4.5.0 – Statistik
- Umsatz, Gewinn, Materialverbrauch, Maschinenlaufzeit und meistgenutzte Materialien

4.6.0 – Einstellungen
- Gemeinkosten, Stromkosten, Standardmaschine und Standardmaterial
- Sicherung und Wiederherstellung bleiben enthalten

4.10.0 – Abschluss und Optimierung
- Bestehende Modularchitektur beibehalten
- doppelte Materialaktionsausgabe bereinigt
- Cache und PWA-Dateien aktualisiert
- mobiles Schwarz-/Anthrazit-Design mit Goldakzenten erweitert

Version 4.0.0 modularisiert die bestehende Anwendung, ohne die Bedienoberfläche
oder gespeicherten Daten zu verändern. Die JavaScript-Funktionen liegen jetzt
fachlich getrennt im Ordner js/. js/app.js übernimmt ausschließlich die
Initialisierung.

Der Angebotsassistent befindet sich in js/estimator.js und enthält weiterhin
Bildvorschau, Material- und Maschinenwahl, Gravieren/Schneiden/Beides,
Zeitabschätzung, Selbstkosten, Verkaufspreis und Preisbereich.

Neu: Motiv-Schätzer mit Bildvorschau, automatischer Detailanalyse, X70-Pro-Referenzwert, Preisberechnung und lernender Zeitkalibrierung.

Daniels Laser Art Kalkulator – Version 3.2.1

Neu in V3.2.1:
- Materialfamilien zeigen oben kein leeres Platzhalterbild mehr.
- Variantenbilder bleiben ausschließlich an den jeweiligen Varianten sichtbar.
- Rabattrechner mit zwei Modi: Ursprungspreis berechnen oder Rabatt aus Normalpreis und Verkaufspreis ermitteln.
- Ersparnis in Euro, Rabatt in Prozent und Bewertung.
- Preise im neuen Rabattmodus mit einem Klick tauschen.
- Cache, Manifest und App-Version auf V3.2.1 aktualisiert.

Installation:
Alle Dateien in /Intern ersetzen.
Danach öffnen:
https://danielslaserart.de/Intern/?v=4.12.1
