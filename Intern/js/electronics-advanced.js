(()=>{"use strict";
const $=id=>document.getElementById(id),fmt=(v,d=2)=>Number(v).toLocaleString("de-DE",{maximumFractionDigits:d});
const catalog={
 dimmer:{title:"PWM-Dimmer",pins:["Netzteil + → DIMMER IN+","Netzteil − → DIMMER IN−","DIMMER OUT+ → LED-Zweig +","DIMMER OUT− → LED-Zweig −"],note:"Nur für dafür geeignete Konstantspannungs-LEDs. PWM-Dimmer-Spannung und Strom müssen zur Last passen. LED-Filamente benötigen ggf. einen speziellen Treiber."},
 pir:{title:"Bewegungsmelder (PIR-Modul)",pins:["Netzteil + → Modul VCC","Netzteil − → Modul GND","Modul OUT → Steuereingang einer geeigneten Treiberstufe","Treiberstufe schaltet die LED-Last"],note:"OUT ist meist ein Steuersignal und darf nicht direkt eine größere LED-Last versorgen. Spannung, Pinbelegung und Schaltstufe hängen vom konkreten Modul ab."},
 ldr:{title:"Dämmerungsschalter-Modul",pins:["Netzteil + → Modul VCC","Netzteil − → Modul GND","Modul OUT → geeignete Treiberstufe oder Relais-Eingang","Treiberstufe → LED-Last"],note:"Die Schaltschwelle wird am Modul eingestellt. Das Modul muss für die verwendete Versorgung geeignet sein."},
 timer:{title:"Zeitrelais-Modul",pins:["Netzteil + / − → Versorgungseingänge des Moduls","COM → abgesicherte Lastversorgung","NO → LED-Last + (bei Einschalten aktiv)","LED-Last − → Netzteil −"],note:"Nur bei passender Kontaktbelastbarkeit und korrekter Modul-Pinbelegung. NO und NC unterscheiden sich je nach gewünschter Funktion."},
 relay:{title:"Relais-Modul",pins:["VCC/GND → geeignete Modulversorgung","IN → kompatibles Steuersignal","COM → abgesicherte Plusversorgung","NO → Last +; Last − → Netzteil −"],note:"Spulenspannung, Eingangssignal, Kontaktbelastbarkeit und Schutzbeschaltung anhand des konkreten Moduls prüfen."},
 buck:{title:"DC/DC-Abwärtswandler (Buck)",pins:["Netzteil + → IN+","Netzteil − → IN−","OUT+ → Verbraucher +","OUT− → Verbraucher −"],note:"Ausgangsspannung vor Anschluss der Last mit dem Multimeter einstellen und messen. Eingangs-/Ausgangsgrenzen und Kühlung beachten."},
 usb:{title:"USB-C-Stromversorgung",pins:["USB-C-Buchse mit geeignetem 5-V-Sink-/Breakout-Modul verwenden","Modul VBUS / +5 V → geeignete Last +","Modul GND → Last −"],note:"5 V nur bei korrekter USB-C-Sink-Beschaltung. 9/12/15/20 V benötigen USB-PD-Aushandlung. Kein direktes Verbinden beliebiger USB-C-Pins."},
 fuse:{title:"Sicherung & Verpolschutz",pins:["Netzteil + → Sicherung (nah an der Quelle)","Sicherung → geeigneter Verpolschutz / Last +","Last − → Netzteil −"],note:"Sicherungswert richtet sich nach Leitungsbelastbarkeit, Einschaltstrom und Fehlerfall; nicht allein nach dem normalen Betriebsstrom."}
};
function renderModule(){
 const item=catalog[$("elModule").value],list=$("elModulePins");$("elModuleTitle").textContent=item.title;list.replaceChildren();
 item.pins.forEach(p=>{const li=document.createElement("li");li.textContent=p;list.append(li)});
 $("elModuleWarning").textContent=item.note;
 $("elModulePlan").textContent="Funktionsübersicht – kein freigegebener Verdrahtungsplan ohne exakte Modulbezeichnung und Pinbelegung.";
}
function renderCable(){
 const v=Number($("elCableV").value),a=Number($("elCableA").value),m=Number($("elCableM").value),drop=Number($("elCableDrop").value),result=$("elCableResult");
 if(![v,a,m,drop].every(Number.isFinite)||v<=0||a<=0||m<=0||drop<=0||drop>=100){result.textContent="Bitte gültige positive Werte eingeben (Spannungsabfall zwischen 0 und 100 %).";return}
 const allowed=v*drop/100,area=2*0.0178*m*a/allowed,standards=[0.14,0.25,0.34,0.5,0.75,1,1.5,2.5,4,6,10,16],recommend=standards.find(x=>x>=area);
 result.textContent="Rechnerisch mindestens "+fmt(area,3)+" mm² Kupfer; nächster Standardquerschnitt: "+(recommend?fmt(recommend)+" mm²":"größer als 16 mm²")+". Nur nach Spannungsabfall berechnet! Strombelastbarkeit, Erwärmung, Leitungstyp und Verlegeart separat prüfen.";
}
function renderSupply(){
 const volts=Number($("elSupplyV").value),amps=Number($("elSupplyA").value),reserve=Number($("elSupplyReserve").value),out=$("elSupplyResult");
 if(![volts,amps,reserve].every(Number.isFinite)||volts<=0||amps<=0||reserve<0||reserve>200){out.textContent="Bitte gültige Werte eingeben.";return}
 out.textContent="Lastleistung: "+fmt(volts*amps)+" W. Netzteil-Empfehlung mit Reserve: mindestens "+fmt(volts*amps*(1+reserve/100))+" W bei "+fmt(volts)+" V; erforderlicher Ausgangsstrom mindestens "+fmt(amps*(1+reserve/100))+" A. Spannungsart und LED-Treiber prüfen.";
}
function renderOhm(){
 const volts=Number($("elOhmV").value),res=Number($("elOhmR").value),out=$("elOhmResult");
 if(!Number.isFinite(volts)||!Number.isFinite(res)||volts<0||res<=0){out.textContent="Bitte Spannung ≥ 0 V und Widerstand > 0 Ω eingeben.";return}
 out.textContent="Strom: "+fmt(volts/res*1000)+" mA ("+fmt(volts/res,4)+" A). Verlustleistung: "+fmt(volts*volts/res,3)+" W.";
}
$("elModule")?.addEventListener("change",renderModule);
["elCableV","elCableA","elCableM","elCableDrop"].forEach(id=>$(id)?.addEventListener("input",renderCable));
["elSupplyV","elSupplyA","elSupplyReserve"].forEach(id=>$(id)?.addEventListener("input",renderSupply));
["elOhmV","elOhmR"].forEach(id=>$(id)?.addEventListener("input",renderOhm));
renderModule();renderCable();renderSupply();renderOhm();
})();