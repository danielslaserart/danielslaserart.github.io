Daniels Laser Art Kalkulator V4.14.1

4.14.1 – Gespeicherte Kalkulationen identisch bearbeiten
- Vollständiger Kalkulations-Snapshot für Hauptrechner und Angebotsassistent.
- Kalkulationsherkunft, Eingaben, Kostenbestandteile und Ergebniswerte werden beim Bearbeiten wiederhergestellt.
- Ältere Projekte ohne Snapshot werden kompatibel über vorhandene Felder geladen.
- Tatsächliche Verkaufspreise werden beim bloßen Öffnen nicht überschrieben.
- Fehler behoben, durch den gespeicherte Kalkulationen beim erneuten Bearbeiten unvollständig geladen und dadurch mit abweichenden Selbstkosten und Verkaufspreisen neu berechnet wurden.

4.14.0 – Material-Bearbeitungsprofile
- Technische Maschinen- und Lasereinstellungen zentral als Bearbeitungsprofile speichern.
- Profile gelten wahlweise für eine gesamte Materialfamilie oder ein konkretes Material beziehungsweise eine vorhandene Variante.
- Materialprofile haben nur bei derselben technischen Kombination Vorrang; andere Familienprofile bleiben verfügbar.
- Maschinen-, Quellen- und Bearbeitungsart-abhängige Felder mit Status, Bewertung, Standardprofil und Notizen.
- Profile anlegen, ansehen, bearbeiten, duplizieren, löschen, filtern und geerbte Familienprofile als eigenes Materialprofil übernehmen.
- Rein informative Anzeige passender Einstellungen im Hauptrechner und Motivschätzer.
- Keine Änderung an Preisen, Laufzeiten, Materialkosten, Maschinenkosten, Projekten, Lernsystem, Statistik oder Authentifizierung.

4.13.6 – Design-&-Dateien-Karte vollständig vergoldet
- Karte „Design & Dateien“ verwendet jetzt dieselbe deckende goldene Hauptkartenklasse wie Schnellstart Angebotsassistent und Neuer Auftrag.
- Die Modifier-Klasse enthält keine abweichenden Hintergrund-, Rahmen-, Text- oder Schattenfarben mehr.
- Keine anderen UI-Bereiche, Berechnungen, Authentifizierungs- oder Navigationsfunktionen geändert.

4.13.5 – Zwei gezielte UI-Korrekturen
- Karte „Design & Dateien“ verwendet vollständig dieselbe Hauptkarten-Basis wie Schnellstart und neuer Auftrag; nur die Farbgebung bleibt als Modifier abgesetzt.
- Horizontalen Overflow der Designseite behoben: Die zu breite Kopfzeile bricht auf schmalen Displays sauber um, Form-Grids und Inhalte dürfen auf die verfügbare Breite schrumpfen.
- Authentifizierung, Motivschätzer, Berechnungen und übrige App-Bereiche unverändert.

4.13.4 – Kritischen Motivschätzer-Startfehler behoben
- Materialherkunft wird in calculateMotifEstimator() sicher aus der vorhandenen Auswahl ermittelt.
- Eigenes Material berechnet Materialkosten wie bisher; Kundenmaterial setzt sie auf 0,00 €.
- Nicht definierte Verwendung von orderType beseitigt.
- Service-Worker-Cache und Registrierungsparameter auf 4.13.4 aktualisiert.

4.13.3 – Kritischen Authentifizierungs-Startfehler behoben
- Supabase-Client wird ausfallsicher und nur einmal initialisiert.
- Sessionprüfung besitzt ein Zeitlimit und kann den Ladebildschirm nicht mehr dauerhaft blockieren.
- Loginformular und „Erneut prüfen“ werden bei Lade-, Netzwerk- und Startfehlern freigegeben.
- Globale JavaScript- und Promise-Startfehler werden verständlich angezeigt.
- Auth-Listener und App-Einstieg sind gegen Mehrfachausführung geschützt.
- Service-Worker-Cache und Registrierungsparameter auf 4.13.3 aktualisiert.

4.13.2 – Startseite, Designkarte, Navigation und Login-Session korrigiert
- Startseite auf die wichtigsten Schnellzugriffe, Tagesübersicht und letzten Projekte verkürzt; ausführliche Werkzeuge und Kennzahlen sind über „Mehr anzeigen“ erreichbar.
- Doppelter großer Einstieg zum Angebotsassistenten entfernt und Schnellrechner kompakter angeordnet.
- Karte „Design & Dateien“ an die Hauptkarten angeglichen.
- Alle sechs Einträge der unteren Navigation verwenden identische Icon- und Textbereiche.
- Supabase-Session wird vor Anzeige des Logins wiederhergestellt; Cloud- und Netzwerkfehler lösen keine Abmeldung mehr aus.
- Service-Worker-Cache und Registrierungsparameter auf 4.13.2 aktualisiert.

4.13.1 – Design-Vorgaben und mobile Startseiten-Karte korrigiert
- Gespeicherter Design-Stundenlohn und gespeicherte Mindestpauschale werden bei neuen Designkalkulationen zuverlässig übernommen.
- Fehlende Einzelwerte greifen auf die Design-Standardwerte zurück; gültige Werte von 0 bleiben erhalten.
- Gespeicherte Projektwerte und manuelle Eingaben werden beim Rendern oder Bildschirmwechsel nicht überschrieben.
- Die Designkarte auf der Startseite heißt kompakt „Design & Dateien“ und bricht auf Mobilgeräten sauber um.

4.13.0 – Design- und Dateidienstleistungen
- Hauptrechner zeigt nur noch Eigenprodukt und Kundenobjekt; die bestehende Dienstleistungslogik bleibt technisch erhalten.
- Motiv-Schätzer unterstützt eigenes Material und Material vom Kunden.
- Kundenmaterial wird für Maschine, Bearbeitung und Lernen berücksichtigt, jedoch mit 0,00 € Materialkosten kalkuliert.
- Eigenständiger Designbereich für Grafik, Logo, Vektorisierung, 3D-Datei, Datenaufbereitung, Beratung und sonstige digitale Leistungen.
- Design-Stundenlohn und Mindestpauschale sind in den Einstellungen änderbar.
- Designaufträge werden mit Projekttyp design gespeichert und in Projektliste, Dashboard und Statistik getrennt ausgewertet.

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
https://danielslaserart.de/Intern/?v=4.14.1
