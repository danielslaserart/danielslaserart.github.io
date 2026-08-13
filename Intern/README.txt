Daniels Laser Art Kalkulator V6.4.6

Version 6.4.6 – Kundenobjekt-Zuschläge wieder bearbeitbar

FEHLERBEHEBUNG 6.4.6

- Ursache behoben: Die vorhandenen Kundenobjekt-Eingaben lagen in einem ausgeblendeten Rechnerbereich.
- Bei „Kundenobjekt bearbeiten“ erscheint nun der editierbare Bereich „Kundenobjekt & Zuschläge“.
- Bearbeitbar sind Kundenobjekt-Wert, Grundpauschale, Schwierigkeit, Risiko, Beratung, Einrichtung, Positionierung, Fokus, Probelauf, Nachkontrolle, Reinigung, Verpackung, Express und sonstige Zuschläge.
- Der Kundenobjekt-Wert dient nur der Risiko-/Haftungsbewertung und bleibt unabhängig von Materialkosten.
- Das Kundenobjekt selbst bleibt kundeneigen mit 0,00 € Materialkosten.
- Zusätzlich verwendetes eigenes Material wird weiterhin ausschließlich über Projektpositionen kalkuliert.
- Die Preisübersicht bleibt eine getrennte Ergebnisanzeige.

STABILISIERUNG 6.4.6

- Bereits abgeschlossene Datenvergleiche blockieren den Start nicht erneut.
- Die Migrationsentscheidung wird nur als technische, benutzergebundene Abschlussmarkierung gespeichert.
- Der lokale Altbestand und der Supabase-Datensatz werden dabei weder gelöscht noch automatisch überschrieben.
- "Leeren" setzt die vollständige aktuelle Berechnung zurück und erzeugt genau eine neutrale Startposition im gewählten Hauptbereich.
- Die Kundenobjekt-Kalkulation enthält wieder Wert, Grundpauschale, Schwierigkeit, Risiko, Beratung, Einrichtung, Positionierung, Fokus, Probelauf, Nachkontrolle, Reinigung, Verpackung, Express und sonstige Zuschläge.
- Das Kundenobjekt selbst bleibt kundeneigen mit 0 € Materialkosten.
- Zusätzliche eigene Materialien und Arbeitsschritte werden über Projektpositionen normal kalkuliert.

SICHERHEITSUMSTELLUNG 6.4.6
- Geschäftsdaten werden erst nach gültiger Anmeldung und erfolgreichem Laden von app_state aktiviert.
- Der lokale Altbestand dla_kalkulator_v3 wird nicht mehr als aktive Datenquelle oder Offline-Ersatz verwendet.
- Bei Abweichungen werden nur Anzahlen, stabile SHA-256-Kurzprüfsummen und der Vergleichsstatus angezeigt.
- Aus dem Vergleich ausgeschlossen sind ausschließlich die flüchtigen Felder timer, lastPrice und activeModule.
- Lokale und Supabase-Sicherungen können unverändert als JSON heruntergeladen werden.
- Eine lokale Übertragung benötigt eine ausdrückliche Bestätigung und wird anschließend erneut gelesen und geprüft.
- Bei fehlendem app_state, Ladefehler oder fehlgeschlagener Migration bleibt die Anwendung geschlossen.
- Abmeldung ersetzt den aktiven Arbeitsspeicherzustand durch neutrale Werte und leert die gerenderten Ansichten.
- Normales Speichern ist zentral gesperrt, bis ein vollständiger Cloud-Datensatz erfolgreich freigegeben wurde.
- Der lokale Altbestand wird weder automatisch überschrieben noch gelöscht.

- Neue Berechnungen starten mit genau einer neutralen Position im Kompaktmodus.
- Erst eine weitere Position aktiviert die einklappbare Mehrpositionsansicht.
- Nach Löschen der zweiten Position wird automatisch wieder kompakt dargestellt.
- Materialien besitzen zusätzlich eine Verwendungskategorie: Werk-, Druck- oder Plottermaterial, Verbrauchsmittel, Verpackung, Zubehör oder Kundengegenstand.
- Die Materialauswahl wird passend zur Tätigkeit gefiltert; Holzleim und Isopropanol erscheinen nicht beim Gravieren oder Schneiden.
- Tätigkeitsfremde Zeit- und Kostenfelder bleiben verborgen.
- Automatische Zusatzartikel sind vollständig deaktiviert.
- Bestehende Materialien ohne Verwendungskategorie werden nur zur Laufzeit sicher eingeordnet und nicht gelöscht.

6.4 – Kritische Fehlerbehebung: Kundenformular speichert Änderungen nicht

- Bestehende Kunden werden jetzt eindeutig anhand ihrer Kunden-ID im lokalen Datenbestand ersetzt.
- Die Kundenbewertung 0 und deaktivierte Checkboxen werden ausdrücklich als gültige Werte übernommen.
- Der Speicherdialog wartet auf lokales Speichern und den Supabase-Upsert.
- Bei einem Speicherfehler bleibt das Formular geöffnet und zeigt eine sichtbare Fehlermeldung.
- Die Erfolgsmeldung erscheint erst nach einem bestätigten Speichervorgang.

6.3 – Moderne Kundenverwaltung

- Version 6.3: Die Kundenakte besitzt jetzt einen kompakten Kundenkopf und die fünf echten Tabs Übersicht, Projekte, Preise, Notizen und Chronik. Pro Ansicht wird ausschließlich der ausgewählte Inhalt dargestellt. Bearbeitungen werden weiterhin über die vorhandenen Dialoge vorgenommen; Preisberechnung, Projektlogik und Kundendatenstruktur bleiben unverändert.

6.2.1 – Abwärtskompatible Projektübersicht

- Version 6.2.1: Ältere Projekte ohne neue Kunden-, Status-, Preis-, Bild- oder Metadatenfelder bleiben sichtbar. Der Kundenfilter behandelt fehlende und ungültige Kunden-IDs als „Ohne Kundenzuordnung“. Einzelne unvollständige Datensätze können das Rendern der Projektliste nicht mehr abbrechen.

6.2 – Kunden- und Projektverknüpfung

- Version 6.2: Projekte können optional und ausschließlich über eine eindeutige customerId mit einer Kundenakte verknüpft werden. Kundenakten zeigen die zugehörige Projekthistorie, automatisch berechnete Kundenstatistiken und Entscheidungshinweise. Projektübersicht, Suche und Filter wurden um die Kundenzuordnung erweitert. Bestehende Projekte bleiben unzugeordnet; es erfolgt keine automatische Namenszuordnung.

6.1 – Kundenakte (CRM Light)

- Version 6.1: Neue Kundenakte mit Stammdaten, Bewertungen, Preisinfos, Warnhinweisen, internen Notizen, Kundenchronik, Zahlungsverhalten, erweiterten Filtern und Volltextsuche. Preisvereinbarungen dienen ausschließlich als Information und werden nie automatisch auf neue Projekte angewendet.

6.0 – Informativere Projektvorschau auf der Startseite

- Version 6.0: Die Projektvorschau auf der Startseite zeigt jetzt neben dem empfohlenen Verkaufspreis auch Preisvereinbarungen, den tatsächlichen Gewinn sowie die Abweichung zur Preisempfehlung übersichtlich und farblich hervorgehoben an.

5.1 – Profilhinweise in der Materialübersicht bereinigt
--------------------------------------------------------
- Doppelte Profilhinweise in der Materialübersicht entfernt.
- Profilhinweise werden systemweit nur einmal, kompakt und grün dargestellt.
- Materialien mit Varianten zeigen den Hinweis ausschließlich an der jeweiligen Variante, Materialien ohne Varianten am Hauptmaterial.
- Profilberechnung, Profile, Profilzuordnungen, Materialien und Varianten bleiben unverändert.

5.0 – Profilzählung und Profilvererbung systemweit korrigiert
- Eigene und geerbte Profile werden für alle Materialfamilien, Hauptmaterialien und Varianten zentral zusammengefasst und nicht doppelt gezählt.
- Familienprofile sind aus der Bearbeiten-Ansicht direkt erreichbar.
- Die globale Profilverwaltung wurde für Mobilgeräte korrigiert.
- Preisarten in Projektkarten werden vollständig als umbrechbares Badge dargestellt.

5.0 – Materialverwaltung final bereinigt
-----------------------------------------
- Doppelte Hauptmaterial-Aktionen entfernt und Varianten kompakt angeordnet.
- Bearbeiten-Buttons springen über stabile Material- und Varianten-IDs direkt zum richtigen Editor.
- Bearbeitungsprofile werden ausschließlich innerhalb der Bearbeiten-Ansicht über einen standardmäßig geschlossenen Bereich verwaltet.
- Der globale Bereich „Material-Bearbeitungsprofile“ entspricht optisch den Materialfamilien-Karten und ist standardmäßig geschlossen.
- Keine Material-, Varianten-, Bestands-, Preis-, Bild-, Favoriten- oder Profildaten wurden migriert oder verändert.

4.16.2 – Offizielles Briefpapier für Angebots-PDFs
---------------------------------------------------
- Angebots-PDFs verwenden die unveränderte Original-PDF des offiziellen Daniels-Laser-Art-Briefpapiers als direkt eingebetteten Seitenhintergrund.
- Anschriftfeld, Dokumentüberschrift, Angebotsdaten und Positionstabelle sind für DIN A4 und DIN-lang-Fensterumschläge neu ausgerichtet.
- Eine dezente Falzmarke bei 105 mm unterstützt das korrekte Falten.
- Mehrseitige Angebote wiederholen Briefpapier, Tabellenkopf, Angebotsnummer und Seitenzahl ohne Inhalte im Kopf- oder Fußbereich.
- Die bisherige Druckansicht bleibt über die zentrale Template-Konstante als Rückfalloption erhalten.
- Preisformeln, Projektdaten, Preisvereinbarungen, Lernsystem, Statistik und Authentifizierung bleiben unverändert.

4.16.0 – Werkstatt-Analyse
---------------------------
- Neue Werkstatt-Analyse für Kalkulationsqualität, Preisvereinbarungen, Werkstattnutzung sowie Lern- und Schätzgenauigkeit.
- Die bisherige Umsatz- und Gewinnstatistik bleibt technisch vollständig erhalten, ist standardmäßig ausgeblendet und kann mit einem zentralen Schalter wieder angezeigt werden.
- Referenzprojekte zählen ausschließlich in der Lernanalyse, niemals als Verkauf, Kundenauftrag oder Preisvereinbarung.
- Alle Auswertungen sind defensiv gegen unvollständige Altdaten; Projekte, Preisformeln, Preisleiter, Preisvereinbarungen und Lernregeln werden nicht verändert.
- Papierkram bleibt die führende Quelle für Rechnungen, Zahlungseingänge, EÜR und steuerliche Auswertungen.

4.15.4 – Preisvereinbarung in der Preisleiter
-----------------------------------------------
- Der vereinbarte Verkaufspreis erscheint bei vorhandenem Wert direkt unter der unveränderten Preisleiter mit lila Statuspunkt.
- Die zusätzliche Auswertung zeigt den aktuellen Gewinn oder Verlust sowie die klassische Gewinnmarge bezogen auf den vereinbarten Verkaufspreis.
- Die Anzeige aktualisiert sich im Hauptrechner sofort, behandelt 0,00 € ohne Division durch null und unterstützt bestehende Projekte defensiv, ohne gespeicherte Preise zu verändern.

4.15.3 – Einheitliche Preisleiter
----------------------------------
- Neue Preisleiter in Hauptrechner, Angebotsassistent und Projektansicht: Kostendeckender Mindestpreis, kalkulierter Arbeitspreis und empfohlener Verkaufspreis stehen direkt untereinander.
- Aktive Zuschläge werden zentral vom zusätzlichen Unternehmensgewinn getrennt; der Gewinnaufschlag bezieht sich auf den kalkulierten Arbeitspreis.
- Bestehende Projekte erhalten die Preisleiter defensiv aus zuverlässig gespeicherten Selbstkosten-, Zwischenpreis- und Empfehlungswerten, ohne gespeicherte Preise zu verändern.
- Farbige Statuspunkte kennzeichnen Kostendeckung, Arbeitspreis, positiven, neutralen oder negativen Unternehmensgewinn.

4.15.2 – Projektansicht und Kostendeckung
------------------------------------------
- Projektansicht bereinigt: interne Feldnamen und doppelte Kalkulationsdaten werden nicht mehr ungefiltert angezeigt.
- Neuer kostendeckender Mindestpreis in Rechner, Angebotsassistent und Projekten.
- Vereinbarte Preise erhalten eine verständliche Kostendeckungs- und Empfehlungsbewertung mit Warnung bei Preisen unter den Selbstkosten.
- „Minimal“ im Angebotsassistenten heißt jetzt sichtbar „Niedrige Preisempfehlung“; die Berechnung blieb unverändert.

4.15.1 – Preisvereinbarung vollständig bearbeitbar
---------------------------------------------------
- Preisvereinbarung optisch an das bestehende App-Design angepasst und vollständig in die Projektbearbeitung integriert. Vereinbarter Preis, Datum, Preisart, Folgebestellungskennzeichnung und Notiz können jetzt direkt eingegeben und geändert werden.
- Weiße Einzelkarten durch kompakte dunkle Detailzeilen mit Goldakzenten ersetzt.
- Bestehende Feldvarianten werden beim Laden verlustfrei auf kanonische Preisvereinbarungsfelder normalisiert.
- Preisvereinbarungsfelder lösen keine Neuberechnung aus und bleiben von Kalkulation, Lernsystem und Statistik getrennt.

4.15.0 – Vereinbarter Verkaufspreis & Kundenpreis-Historie
----------------------------------------------------------
- Neue Kundenpreis-Historie: Vereinbarte Verkaufspreise, Stammkundenpreise und frühere Preisvereinbarungen können jetzt unabhängig von Kalkulation, Lernsystem und Statistik dokumentiert und bei Folgebestellungen angezeigt werden.
- Eigener Bereich „Preisvereinbarung“ mit Datum, interner Notiz, Stammkundenkennzeichnung, Abweichung zur Empfehlung sowie informativem Gewinn und Marge.
- Frühere Vereinbarungen desselben Kunden und bis zu drei konservativ ermittelte ähnliche Projekte werden priorisiert angezeigt.
- Historische Preise werden ausschließlich nach Bestätigung als `agreementPrice` übernommen.
- Ältere Projekte bleiben ohne automatische Befüllung kompatibel.

4.14.3 – Verständliche Kalkulationsübersicht für Kundenobjekte
---------------------------------------------------------------
- Kalkulationsübersicht für Kundenobjekte verständlicher gegliedert: Selbstkosten, Preisbestandteile, Rundungsdifferenz, Verkaufspreis und tatsächlicher Gewinn werden nun eindeutig getrennt dargestellt.
- Grundpauschale und Verkaufsaufschläge werden nicht mehr optisch mit den tatsächlichen Selbstkosten vermischt.
- Hauptrechner, Angebotsassistent und Projektansicht verwenden dieselben eindeutigen Bezeichnungen und Ausgangswerte.
- Der tatsächliche Gewinn wird als finaler Verkaufspreis abzüglich Selbstkosten erklärt; die Marge bezieht sich sichtbar auf den Verkaufspreis.
- Kundenangebote enthalten weiterhin keine internen Selbstkosten-, Gewinn- oder Margenangaben.

4.14.2 – Einheitliche Kundenobjekt-Kalkulation im Angebotsassistenten
- Angebotsassistent und Hauptrechner verwenden bei Kundenobjekten dieselbe zentrale Kalkulationsfunktion.
- Auftragstyp, konfigurierte Grundpauschale, Mindestpreis, Arbeits- und Maschinenkosten sowie Kundenobjekt-Zuschläge werden gemeinsam berücksichtigt.
- Kompatible Normalisierung älterer Auftragstyp-Bezeichnungen ergänzt.
- Übernahme in den Preisrechner erhält Auftragstyp und auftragstypabhängige Werte.
- Fehler behoben, durch den der Angebotsassistent bei Kundenobjekten die Grundpauschale und weitere auftragstypabhängige Kalkulationsbestandteile nicht identisch zum Hauptrechner berücksichtigte.

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
https://danielslaserart.de/Intern/?v=6.4.6
Version 6.4.6 – Projektpositionen sichtbar und neutraler Start

- Projektpositionen sind direkt in der normalen Berechnungsmaske sichtbar und bedienbar.
- Neue Berechnungen starten ohne Positionen und ohne automatisch eingefügte Zusatzartikel.
- Die alte Einzelmaterial-Auswahl wird bei bestehenden Projekten als erste Position übernommen.
- Verbrauchsmittel werden ausschließlich bewusst als eigene Position hinzugefügt.

Version 6.4 – Projektpositionen

- Projekte können beliebig viele getrennte Positionen enthalten.
- Jede Position besitzt eigenes Material, Variante, Tätigkeit, Maschine, Zeiten und Kosten.
- Unterstützte Tätigkeiten: Gravieren, Schneiden, kombiniert, 3D-Druck, Plotten, Kleben, Montieren, Verpacken, Nur Material und Sonstiges.
- Materialien können aus der Materialverwaltung, einmalig manuell oder als kundeneigenes Material mit 0 Euro gewählt werden.
- Positionen sind kompakt aufklappbar und können bearbeitet, dupliziert, gelöscht und verschoben werden.
- Material-, Maschinen-, Arbeits- und sonstige Kosten werden getrennt sowie als Gesamtkalkulation summiert.
- Lagerbestände werden beim Projektabschluss je Position höchstens einmal reduziert.
- Alte Projekte bleiben unverändert erhalten und werden zunächst nur als virtuelle erste Position dargestellt.
