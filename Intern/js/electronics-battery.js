(()=>{"use strict";
const $=id=>document.getElementById(id);
const fmt=(n,d=1)=>Number(n).toLocaleString("de-DE",{maximumFractionDigits:d});
const types={alkaline:{v:1.5,capacity:2000,label:"AA Alkaline"},nimh:{v:1.2,capacity:1900,label:"AA NiMH"},aaa:{v:1.5,capacity:900,label:"AAA Alkaline"},custom:{v:1.5,capacity:2000,label:"Eigene Werte"}};
function calculate(){
 const kind=$("elBatteryType").value,t=types[kind],count=Number($("elBatteryCount").value),series=Number($("elBatterySeries").value),volts=Number($("elBatteryVolts").value),capacity=Number($("elBatteryCapacity").value),loadV=Number($("elLoadVolts").value),loadA=Number($("elLoadCurrent").value),eff=Number($("elBatteryEfficiency").value)/100,usable=Number($("elBatteryUsable").value)/100,out=$("elBatteryResult");
 if(![count,series,volts,capacity,loadV,loadA,eff,usable].every(Number.isFinite)||!Number.isInteger(count)||count<1||count>24||!Number.isInteger(series)||series<1||count%series!==0||volts<=0||capacity<=0||loadV<=0||loadA<=0||eff<=0||eff>1||usable<=0||usable>1){out.textContent="Bitte gültige Werte eingeben. Die Anzahl der Batterien muss durch die Anzahl in Reihe teilbar sein.";return}
 const parallel=count/series,inputV=volts*series,energy=inputV*(capacity/1000)*parallel,loadW=loadV*loadA,needConverter=Math.abs(inputV-loadV)>0.15;
 const nominal=energy*eff/loadW,practical=nominal*usable;
 const status=needConverter?(inputV<loadV?"Spannungswandler (Step-up) erforderlich.":"Spannungsregler bzw. geeigneter LED-Treiber erforderlich."):"Spannung ungefähr passend; Spannungsverlauf und LED-Treiber trotzdem prüfen.";
 out.replaceChildren();
 const lines=[["Batteriespannung (Nennwert)",fmt(inputV,2)+" V"],["Verschaltung",series+" in Reihe × "+parallel+" parallele Gruppe(n)"],["Gespeicherte Energie (idealisiert)",fmt(energy,2)+" Wh"],["Verbraucherleistung",fmt(loadW,2)+" W"],["Theoretische Laufzeit",fmt(nominal,1)+" Stunden"],["Vorsichtige Schätzung",fmt(practical,1)+" Stunden"],["Anschluss-Hinweis",status]];
 for(const [label,value] of lines){const row=document.createElement("div"),a=document.createElement("span"),b=document.createElement("strong");a.textContent=label;b.textContent=value;row.append(a,b);out.append(row)}
 $("elBatteryNote").textContent="Schätzwert, keine garantierte Leuchtdauer: Batterie-Kapazität hängt von Laststrom, Temperatur und Entladeschluss ab. Die LED kann früher sichtbar dunkler werden oder der Wandler abschalten. Bei hohen Strömen sind AA-Batterien häufig deutlich früher leer.";
}
function preset(){const t=types[$("elBatteryType").value];$("elBatteryVolts").value=t.v;$("elBatteryCapacity").value=t.capacity;calculate()}
$("elBatteryType")?.addEventListener("change",preset);
["elBatteryCount","elBatterySeries","elBatteryVolts","elBatteryCapacity","elLoadVolts","elLoadCurrent","elBatteryEfficiency","elBatteryUsable"].forEach(id=>$(id)?.addEventListener("input",calculate));
calculate();
})();