(()=>{"use strict";
const $=id=>document.getElementById(id);
const fmt=(n,d=1)=>Number(n).toLocaleString("de-DE",{maximumFractionDigits:d});
const types={alkaline:{v:1.5,capacity:2000},nimh:{v:1.2,capacity:1900},aaa:{v:1.5,capacity:900},custom:{v:1.5,capacity:2000}};
function line(container,name,value){const row=document.createElement("div"),a=document.createElement("span"),b=document.createElement("strong");a.textContent=name;b.textContent=value;row.append(a,b);container.append(row)}
function update(){
 const mode=$("elBatteryMode").value,supply=$("elBatterySupply").value,converter=supply==="converter";
 $("elBatteryTargetLabel").hidden=mode!=="sizing";
 $("elBatteryCountLabel").hidden=mode!=="runtime";
 $("elBatterySeriesLabel").hidden=mode!=="runtime";
 $("elBatteryEfficiencyLabel").hidden=!converter;
 const n=Number($("elBatteryCount").value),series=Number($("elBatterySeries").value),bv=Number($("elBatteryVolts").value),mah=Number($("elBatteryCapacity").value),lv=Number($("elLoadVolts").value),ma=Number($("elLoadCurrent").value),target=Number($("elBatteryTarget").value),eff=converter?Number($("elBatteryEfficiency").value)/100:1,usable=Number($("elBatteryUsable").value)/100;
 const out=$("elBatteryResult"),note=$("elBatteryNote");out.replaceChildren();note.textContent="";
 const valid=[bv,mah,lv,ma,eff,usable].every(x=>Number.isFinite(x)&&x>0)&&eff<=1&&usable<=1&&Number.isFinite(target)&&target>0;
 if(!valid){out.textContent="Bitte positive Werte eingeben; Prozentwerte maximal 100 %.";return}
 const power=lv*ma/1000,cellWh=bv*mah/1000,cellAh=mah/1000;
 if(mode==="runtime"){
  if(!Number.isInteger(n)||!Number.isInteger(series)||n<1||series<1||n>200||series>n||n%series!==0){out.textContent="Batterieanzahl und Reihenzahl müssen ganze Zahlen sein; Gesamtzahl muss durch Reihenzahl teilbar sein.";return}
  const groups=n/series,inputV=bv*series,energy=cellWh*n;
  const directCurrent=ma/1000;
  const hours=converter?energy*eff/power:cellAh*groups/directCurrent;
  const nominalMismatch=Math.abs(inputV-lv)>Math.max(.15,lv*.07);
  line(out,"Batteriespannung (nominal)",fmt(inputV,2)+" V");
  line(out,"Verschaltung",series+" in Reihe × "+groups+" parallel");
  line(out,"Theoretische Laufzeit",fmt(hours,1)+" Stunden");
  line(out,"Vorsichtige Schätzung",fmt(hours*usable,1)+" Stunden");
  if(converter){line(out,"LED-Leistung",fmt(power,3)+" W");line(out,"Nutzbarer Energieansatz",fmt(energy*eff,2)+" Wh")}
  line(out,"Versorgung",converter?"Wandler / LED-Treiber passend auslegen":nominalMismatch?"Achtung: gemessene LED-Spannung weicht von Batterie-Nennspannung ab.":"Direktversorgung: Spannung und Strom im Betrieb prüfen.");
  note.textContent="Messwert gilt nur bei der gemessenen Spannung. Bei Direktversorgung sinken Spannung, Strom und Helligkeit häufig während der Entladung. Laufzeit bis zur gewünschten Helligkeit kann erheblich kürzer sein. Die Kapazitätsangabe ist lastabhängig; Parallelschaltung nur mit geeigneten, gleichartigen Zellen.";
 }else{
  // Sizing requires a regulated output: direct connection cannot guarantee constant LED voltage/current.
  const cellsSeries=Math.max(1,Math.ceil(lv/bv));
  const inputV=cellsSeries*bv;
  const perStringWh=cellsSeries*cellWh;
  const energyNeeded=power*target/(eff*usable);
  const strings=Math.max(1,Math.ceil(energyNeeded/perStringWh));
  const total=cellsSeries*strings;
  line(out,"Verbraucherleistung",fmt(power,3)+" W");
  line(out,"Erforderliche Batterieenergie (inkl. Abschlag)",fmt(energyNeeded,2)+" Wh");
  line(out,"Rechnerischer Vorschlag",total+" Zellen ("+cellsSeries+" in Reihe × "+strings+" parallel)");
  line(out,"Batterie-Nennspannung",fmt(inputV,2)+" V");
  line(out,"Spannungsanpassung",converter?"Wandler/Treiber passend auswählen":"Direktbetrieb nicht allein aus Zellzahl ableitbar");
  note.textContent=converter?"Nur grobe Energiedimensionierung. Wandler muss für den gesamten Batterie-Spannungsbereich ausgelegt sein. Entladestrom, Zellchemie, sichere Parallel-/Reihenschaltung und Schutzschaltung gesondert prüfen.":"WICHTIG: Die Zellanzahl ist nur eine rechnerische Energieschätzung, KEINE sichere direkte Verdrahtungsempfehlung. Batterien haben keine konstante Spannung; bei LED-Bändern muss der zulässige Spannungsbereich bekannt sein. Für eine feste Versorgungsspannung passenden Regler/Treiber wählen. Zellbelastbarkeit und Schutzschaltung prüfen.";
 }
}
function preset(){const t=types[$("elBatteryType").value];$("elBatteryVolts").value=t.v;$("elBatteryCapacity").value=t.capacity;update()}
$("elBatteryType")?.addEventListener("change",preset);
["elBatteryMode","elBatterySupply"].forEach(id=>$(id)?.addEventListener("change",update));
["elBatteryCount","elBatterySeries","elBatteryVolts","elBatteryCapacity","elLoadVolts","elLoadCurrent","elBatteryTarget","elBatteryEfficiency","elBatteryUsable"].forEach(id=>$(id)?.addEventListener("input",update));
update();
})();