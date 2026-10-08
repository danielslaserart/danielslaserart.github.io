(()=>{"use strict";
const $=id=>document.getElementById(id);
const fmt=(v,d=2)=>Number(v).toLocaleString("de-DE",{maximumFractionDigits:d});
const e12=[1,1.2,1.5,1.8,2.2,2.7,3.3,3.9,4.7,5.6,6.8,8.2,10];
function draw(){
 const v=Number($("elVoltage").value),f=Number($("elForward").value),ma=Number($("elMilliamp").value),series=Number($("elSeries").value),branches=Number($("elBranches").value),part=$("elPart").value;
 const result=$("elResults"),diagram=$("elDiagram");
 if(![v,f,ma,series,branches].every(Number.isFinite)||v<=0||f<=0||ma<=0||!Number.isInteger(series)||series<1||series>12||!Number.isInteger(branches)||branches<1||branches>8||v<=f*series){result.textContent="Bitte gültige Werte eingeben: Die Netzteilspannung muss höher als die LED-Gesamtspannung je Zweig sein.";diagram.replaceChildren();return}
 const drop=v-f*series,ideal=drop/(ma/1000),scale=10**Math.floor(Math.log10(ideal)),res=(e12.find(x=>x*scale>=ideal-1e-9)||10)*scale;
 const current=drop/res*1000,watts=drop*drop/res,capacity=[.125,.25,.5,1,2,3,5,10].find(x=>x>=watts*2);
 const existing=$("elKnown").value,known=existing!==""?Number(existing):null;
 const rows=[["Berechnet je Zweig",fmt(ideal)+" Ω"],["Empfohlen (E12)",fmt(res)+" Ω"],["Strom je Zweig",fmt(current)+" mA"],["Gesamtstrom",fmt(current*branches)+" mA"],["Verlustleistung je Widerstand",fmt(watts,3)+" W"],["Belastbarkeit (2× Reserve)",capacity?fmt(capacity,3)+" W":"Sonderauslegung nötig"]];
 if(known!==null)rows.push(["Vorhandener Widerstand",known>0?fmt(drop/known*1000)+" mA · "+fmt(drop*drop/known,3)+" W"+(drop/known*1000>ma?" ⚠ über Zielstrom":""):"Widerstand muss > 0 Ω sein"]);
 result.replaceChildren();for(const [a,b] of rows){const line=document.createElement("div"),label=document.createElement("span"),value=document.createElement("strong");label.textContent=a;value.textContent=b;line.append(label,value);result.append(line)}
 const ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg"),h=150+branches*72;
 svg.setAttribute("viewBox","0 0 560 "+h);svg.setAttribute("preserveAspectRatio","xMidYMin meet");svg.setAttribute("role","img");svg.setAttribute("aria-label","Gleichstrom-Schaltplan mit "+branches+" parallelen Zweigen");svg.style.cssText="display:block;width:100%;height:auto;max-width:100%;overflow:visible";
 const node=(tag,attrs,txt)=>{const x=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))x.setAttribute(k,String(v));if(txt!==undefined)x.textContent=txt;svg.append(x);return x};
 const wire=d=>node("path",{d,stroke:"#b08d57","stroke-width":2.4,fill:"none"});
 const label=(x,y,s)=>node("text",{x,y,fill:"currentColor","font-size":12,"text-anchor":"middle"},s);
 node("rect",{x:10,y:20,width:68,height:55,rx:6,stroke:"#b08d57",fill:"none"});label(44,42,"DC +");label(44,61,"−");
 wire("M78 34 H"+(part==="none"?180:112));if(part!=="none"){wire(part==="fuse"?"M112 34 H180":"M112 34 L158 19 M165 34 H180");label(146,15,part==="switch"?"S1":part==="button"?"S1": "F1")}
 wire("M"+(part==="none"?180:180)+" 34 H210 V90 V"+(90+(branches-1)*72));
 wire("M515 90 V"+(90+(branches-1)*72)+" V"+(h-20)+" H44 V75");
 for(let i=0;i<branches;i++){const y=90+i*72;wire("M210 "+y+" H255 M312 "+y+" H370 M403 "+y+" H515");node("rect",{x:255,y:y-12,width:57,height:24,stroke:"#b08d57",fill:"none"});wire("M370 "+(y-13)+" L392 "+y+" L370 "+(y+13)+" Z M397 "+(y-15)+" V"+(y+15));label(283,y-19,"R"+(i+1));label(283,y+30,fmt(res)+" Ω");wire("M377 "+(y-16)+" L389 "+(y-28)+" M389 "+(y-28)+" l-2 7 M389 "+(y-28)+" l-7 2 M387 "+(y-10)+" L399 "+(y-22)+" M399 "+(y-22)+" l-2 7 M399 "+(y-22)+" l-7 2");label(388,y+34,series+"× LED")}
 diagram.replaceChildren(svg);
 $("elSafety").textContent=part==="fuse"?"Sicherung nur symbolisch: Typ und Nennwert gesondert anhand der Leitung auslegen.":"Jeder parallele Zweig benötigt seinen eigenen Vorwiderstand. Nur Kleinspannungs-Gleichstrom; LED-Datenblattwerte prüfen.";
}
["elVoltage","elForward","elMilliamp","elSeries","elBranches","elKnown","elPart"].forEach(id=>$(id)?.addEventListener("input",draw));
$("elPrint")?.addEventListener("click",()=>window.print());
draw();
})();