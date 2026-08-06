export const $ = id => document.getElementById(id);
export const num = v => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  return Number(String(v ?? "").replace(",", ".")) || 0;
};
export const euro = v => new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(num(v));
export const uid = () => crypto.randomUUID ? crypto.randomUUID() : Date.now()+"-"+Math.random().toString(16).slice(2);
export const esc = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

export const MATERIAL_CATEGORIES={
  "Laser":["Holz","Schiefer & Stein","Metall","Acryl & Kunststoff","Glas","Leder","Rohlinge","Sonstiges"],
  "3D-Druck":["Filament PLA","Filament PETG","Filament TPU","Filament ASA / ABS","Spezialfilament","Harz","Sonstiges"],
  "Vinylfolie":["Vinylfolie","Spezialfolie","Reflexfolie","Sonstiges"],
  "Übertragungsfolie":["Übertragungsfolie","Sonstiges"],
  "Textilfolie":["Textilfolie","Spezialfolie","Textilien","Rohlinge","Sonstiges"],
  "Sonstiges":["Kleber","Reinigung","Schleifen","Farbe & Finish","Abkleben","Wartung","Verpackung","Sonstiges"]
};
export const MATERIAL_USE_CATEGORIES=[
  ["work","Werkmaterial"],["print","Druckmaterial"],["plot","Plottermaterial"],
  ["consumable","Verbrauchsmittel"],["packaging","Verpackung"],["accessory","Zubehör"],
  ["customer","Kundengegenstand"]
];
export function inferMaterialUseCategory(m={}){
  if(MATERIAL_USE_CATEGORIES.some(([value])=>value===m.useCategory))return m.useCategory;
  const name=String(m.name||"").toLowerCase(),category=String(m.category||m.consumableCategory||"").toLowerCase();
  if(m.consumableRole){
    if(category.includes("verpack")||/karton|schachtel|versand|verpack/.test(name))return "packaging";
    if(/magnet|öse|haken|schraub|band|zubehör/.test(name))return "accessory";
    return "consumable";
  }
  if(/kundengegenstand|kundenmaterial|fremdartikel/.test(name))return "customer";
  if(m.area==="3D-Druck")return "print";
  if(["Vinylfolie","Übertragungsfolie","Textilfolie"].includes(m.area))return "plot";
  return "work";
}
export function inferMaterialCategory(m){
  if(m.category)return m.category;
  if(m.consumableRole)return m.consumableCategory||"Sonstiges";
  const n=String(m.name||"").toLowerCase();
  if(m.area==="3D-Druck"){
    if(n.includes("petg"))return "Filament PETG";if(n.includes("tpu"))return "Filament TPU";if(n.includes("asa")||n.includes("abs"))return "Filament ASA / ABS";if(n.includes("harz")||n.includes("resin"))return "Harz";if(n.includes("pla"))return "Filament PLA";return "Spezialfilament";
  }
  if(m.area==="Laser"){
    if(/holz|mdf|sperr|multiplex|pappel|birke|buche/.test(n))return "Holz";if(/schiefer|stein|marmor/.test(n))return "Schiefer & Stein";if(/acryl|kunststoff/.test(n))return "Acryl & Kunststoff";if(/metall|alu|edelstahl|messing|zippo/.test(n))return "Metall";if(n.includes("glas"))return "Glas";if(/leder|kork/.test(n))return "Leder";return "Sonstiges";
  }
  return (MATERIAL_CATEGORIES[m.area]||["Sonstiges"])[0];
}
export function categoryOptions(area,selected=""){
  const cats=MATERIAL_CATEGORIES[area]||["Sonstiges"];
  return cats.map(c=>`<option ${c===selected?"selected":""}>${esc(c)}</option>`).join("");
}

export function compressProjectImage(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=reject;
    reader.onload=()=>{
      const img=new Image();
      img.onerror=reject;
      img.onload=()=>{
        const max=1200,scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
        const ctx=canvas.getContext("2d");ctx.drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",0.78));
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}
