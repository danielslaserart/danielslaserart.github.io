import { $, num, euro, uid, esc, MATERIAL_CATEGORIES, inferMaterialCategory, categoryOptions, compressProjectImage } from "./utils.js";
import { state, save } from "./storage.js";
import { calculate } from "./calculator.js";
const dialog=$("materialDialog");
$("newMaterialBtn").onclick=()=>openMaterial();
$("closeMaterialBtn").onclick=()=>dialog.close();
$("materialSearch").oninput=renderMaterials;
$("materialAreaFilter").onchange=()=>{renderMaterialCategoryFilter();renderMaterials()};
$("materialCategoryFilter").onchange=renderMaterials;
let materialListMode="all";
let allMaterialGroupsOpen=false;
$("showFavoritesBtn").onclick=()=>{materialListMode=materialListMode==="favorites"?"all":"favorites";updateMaterialModeButtons();renderMaterials()};
$("showRecentMaterialsBtn").onclick=()=>{materialListMode=materialListMode==="recent"?"all":"recent";updateMaterialModeButtons();renderMaterials()};
$("toggleMaterialGroupsBtn").onclick=()=>{
  allMaterialGroupsOpen=!allMaterialGroupsOpen;
  $("toggleMaterialGroupsBtn").textContent=allMaterialGroupsOpen?"Alle einklappen":"Alle ausklappen";
  document.querySelectorAll(".material-category").forEach(group=>group.open=allMaterialGroupsOpen);
};
export function updateMaterialModeButtons(){
  $("showFavoritesBtn").classList.toggle("active-filter",materialListMode==="favorites");
  $("showRecentMaterialsBtn").classList.toggle("active-filter",materialListMode==="recent");
}
export function renderMaterialCategoryFilter(){
  const area=$("materialAreaFilter").value,old=$("materialCategoryFilter").value;
  const cats=[...new Set(state.materials.filter(m=>!area||m.area===area).map(m=>inferMaterialCategory(m)))].sort((a,b)=>a.localeCompare(b,"de"));
  $("materialCategoryFilter").innerHTML='<option value="">Alle Kategorien</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join("");
  if(cats.includes(old))$("materialCategoryFilter").value=old;
}
["materialPrice","materialQuantity"].forEach(id=>$(id).oninput=previewUnit);
$("materialUnit").oninput=()=>{previewUnit();toggleMaterialAreaBox();updateWorkshopUnitSentence()};
$("materialWorkshopUnit").oninput=updateWorkshopUnitSentence;
$("materialWorkshopUnitAmount").oninput=updateWorkshopUnitSentence;
$("materialConsumableRole").onchange=toggleConsumableFields;
$("materialArea").onchange=()=>{renderMaterialCategorySelect();toggleMaterialAreaBox()};
let materialImageData="";
$("materialImageInput").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;materialImageData=await compressProjectImage(f);renderMaterialImagePreview()};
$("calculateMaterialAreaBtn").onclick=calculateMaterialPurchasedArea;
$("addMaterialVariantBtn").onclick=()=>{
  editingMaterialVariants.push(normalizeVariant({name:"",unit:$("materialUnit").value,quantity:1,trackStock:true,stock:0}));
  renderMaterialVariantRows();
  toggleMaterialFamilyMode();
};
["materialWidth","materialHeight","materialDimensionUnit","materialSheetCount"].forEach(id=>$(id).oninput=updateMaterialAreaHint);
function renderMaterialCategorySelect(selected=""){$("materialCategory").innerHTML=categoryOptions($("materialArea").value,selected)}
function toggleMaterialAreaBox(){$("materialAreaDimensions").classList.toggle("hidden",!["cm²","m²"].includes($("materialUnit").value))}
function renderMaterialImagePreview(){const box=$("materialImagePreview");box.classList.toggle("hidden",!materialImageData);box.innerHTML=materialImageData?`<img src="${materialImageData}" alt="Materialbild"><button id="removeMaterialImageBtn" type="button">×</button>`:"";if(materialImageData)$("removeMaterialImageBtn").onclick=()=>{materialImageData="";renderMaterialImagePreview()}}
function dimensionToCm(v,u){return num(v)*(u==="mm"?.1:u==="m"?100:1)}
function updateMaterialAreaHint(){const area=dimensionToCm($("materialWidth").value,$("materialDimensionUnit").value)*dimensionToCm($("materialHeight").value,$("materialDimensionUnit").value)*Math.max(1,num($("materialSheetCount").value));$("materialAreaHint").textContent=area?`Gesamtfläche: ${area.toLocaleString("de-DE",{maximumFractionDigits:2})} cm² = ${(area/10000).toLocaleString("de-DE",{maximumFractionDigits:4})} m²`:""}
function calculateMaterialPurchasedArea(){const area=dimensionToCm($("materialWidth").value,$("materialDimensionUnit").value)*dimensionToCm($("materialHeight").value,$("materialDimensionUnit").value)*Math.max(1,num($("materialSheetCount").value));if(!area){alert("Bitte Breite und Höhe eingeben.");return}$("materialUnit").value=$("materialUnit").value==="m²"?"m²":"cm²";$("materialQuantity").value=$("materialUnit").value==="m²"?Number((area/10000).toFixed(6)):Number(area.toFixed(2));previewUnit();updateMaterialAreaHint()}
function updateWorkshopUnitSentence(){
  const workshopName=$("materialWorkshopUnit")?.value.trim()||"Werkstatt-Einheit";
  const purchaseUnit=$("materialUnit")?.value||"Einheit";
  const amount=$("materialWorkshopUnitAmount")?.value||"1";
  const label=$("materialWorkshopAmountLabel");
  const suffix=$("materialWorkshopUnitSuffix");
  const example=$("materialWorkshopUnitExample");
  if(label) label.childNodes[0].nodeValue=`1 ${workshopName} entspricht `;
  if(suffix) suffix.textContent=purchaseUnit;
  if(example) example.textContent=`1 ${workshopName} = ${amount} ${purchaseUnit}`;
}
function toggleConsumableFields(){
  $("consumableSettings").classList.toggle("hidden",!$("materialConsumableRole").checked);
  updateWorkshopUnitSentence();
}
function toggleMaterialFamilyMode(){
  const hasVariants=editingMaterialVariants.length>0;
  $("materialBasePurchaseFields")?.classList.toggle("hidden",hasVariants);
  $("materialFamilyHint")?.classList.toggle("hidden",!hasVariants);
  if($("materialPrice"))$("materialPrice").required=!hasVariants;
  if($("materialQuantity"))$("materialQuantity").required=!hasVariants;
}


let editingMaterialVariants=[];
function normalizeVariant(v,m={}){
  const quantity=Math.max(0.000001,num(v?.quantity)||1),price=num(v?.price);
  const images=Array.isArray(v?.images)?v.images.filter(Boolean):(v?.image?[v.image]:[]);
  return {id:v?.id||uid(),name:v?.name||"",price,quantity,unit:v?.unit||m.unit||"Stück",unitPrice:price/quantity,trackStock:Boolean(v?.trackStock),stock:num(v?.stock),minStock:num(v?.minStock),favorite:Boolean(v?.favorite),images,image:images[0]||"",note:v?.note||"",location:v?.location||"",supplier:v?.supplier||"",properties:v?.properties||"",stockHistory:Array.isArray(v?.stockHistory)?v.stockHistory:[]};
}
function syncVariantTitleImage(v){
  v.images=Array.isArray(v.images)?v.images.filter(Boolean):[];
  v.image=v.images[0]||"";
}
function renderMaterialVariantRows(){
  const box=$("materialVariantRows");if(!box)return;
  box.innerHTML=editingMaterialVariants.length?editingMaterialVariants.map((v,i)=>{
    syncVariantTitleImage(v);
    const gallery=v.images.length?`<div class="variant-image-gallery">${v.images.map((img,j)=>`<div class="variant-gallery-item ${j===0?"is-title":""}"><img src="${img}" alt="Bild ${j+1} von ${esc(v.name||"Variante")}">${j===0?`<span class="title-image-badge">Titelbild</span>`:`<button class="ghost tiny set-variant-title" data-set-v-title="${i}:${j}" type="button">Als Titel</button>`}<button class="image-remove-mini" data-remove-v-gallery="${i}:${j}" type="button" aria-label="Bild entfernen">×</button></div>`).join("")}</div>`:`<div class="variant-edit-thumb variant-image-placeholder">🖼️</div>`;
    return `<div class="variant-row" data-variant-row="${i}">
    <div class="variant-image-editor">
      ${gallery}
      <div class="variant-image-actions">
        <label class="secondary small file-button">📷 Foto aufnehmen<input data-v-camera="${i}" type="file" accept="image/*" capture="environment"></label>
        <label class="secondary small file-button">🖼️ Aus Galerie<input data-v-gallery="${i}" type="file" accept="image/*" multiple></label>
      </div>
      <small class="variant-image-help">Bis zu 6 Bilder. Das erste Bild ist das Titelbild.</small>
    </div>
    <label>Bezeichnung<input data-v-field="name" data-v-index="${i}" value="${esc(v.name)}" placeholder="z. B. 20×20 cm"></label>
    <label>Einkaufspreis (€)<input data-v-field="price" data-v-index="${i}" type="number" min="0" step="any" value="${num(v.price)}"></label>
    <label>Gekaufte Menge<input data-v-field="quantity" data-v-index="${i}" type="number" min="0.000001" step="any" value="${num(v.quantity)||1}"></label>
    <label>Einheit<select data-v-field="unit" data-v-index="${i}">${["Stück","g","kg","cm²","m²","cm","m","ml","l"].map(u=>`<option ${u===v.unit?"selected":""}>${u}</option>`).join("")}</select></label>
    <label>Lieferant der Variante<input data-v-field="supplier" data-v-index="${i}" value="${esc(v.supplier||"")}" placeholder="optional, sonst gilt der Lieferant oben"></label>
    <label>Lagerplatz<input data-v-field="location" data-v-index="${i}" value="${esc(v.location||"")}" placeholder="optional, z. B. Regal B3"></label>
    <label class="variant-note-field">Eigenschaften<input data-v-field="properties" data-v-index="${i}" value="${esc(v.properties||"")}" placeholder="z. B. Farbe: Schwarz · Stärke: 3 mm"></label>
    <label class="variant-note-field">Notiz<input data-v-field="note" data-v-index="${i}" value="${esc(v.note||"")}" placeholder="optional, z. B. matt / raue Kante"></label>
    <button class="danger remove-variant" data-remove-variant="${i}" type="button">Entfernen</button>
    <div class="variant-stock-box">
      <label class="check-row"><input data-v-field="trackStock" data-v-index="${i}" type="checkbox" ${v.trackStock?"checked":""}><span>Stückbestand verwalten</span></label>
      <label>Aktueller Bestand<input data-v-field="stock" data-v-index="${i}" type="number" step="1" value="${num(v.stock)}"></label>
      <label>Mindestbestand<input data-v-field="minStock" data-v-index="${i}" type="number" min="0" step="1" value="${num(v.minStock)}"></label>
    </div>
  </div>`}).join(""):'<div class="empty-state compact">Noch keine Varianten. Für Schiefergrößen einfach „+ Variante“ drücken.</div>';
  box.querySelectorAll("[data-v-field]").forEach(el=>el.oninput=()=>{const v=editingMaterialVariants[+el.dataset.vIndex];const f=el.dataset.vField;v[f]=el.type==="checkbox"?el.checked:(el.type==="number"?num(el.value):el.value);});
  async function addVariantImages(index,files){
    const v=editingMaterialVariants[index];v.images=Array.isArray(v.images)?v.images:[];
    const free=Math.max(0,6-v.images.length);
    for(const file of Array.from(files).slice(0,free))v.images.push(await compressProjectImage(file));
    syncVariantTitleImage(v);renderMaterialVariantRows();
  }
  box.querySelectorAll("[data-v-camera]").forEach(input=>input.onchange=async()=>{if(input.files?.length)await addVariantImages(+input.dataset.vCamera,input.files);});
  box.querySelectorAll("[data-v-gallery]").forEach(input=>input.onchange=async()=>{if(input.files?.length)await addVariantImages(+input.dataset.vGallery,input.files);});
  box.querySelectorAll("[data-set-v-title]").forEach(b=>b.onclick=()=>{const [i,j]=b.dataset.setVTitle.split(":").map(Number);const v=editingMaterialVariants[i];const [img]=v.images.splice(j,1);v.images.unshift(img);syncVariantTitleImage(v);renderMaterialVariantRows();});
  box.querySelectorAll("[data-remove-v-gallery]").forEach(b=>b.onclick=()=>{const [i,j]=b.dataset.removeVGallery.split(":").map(Number);const v=editingMaterialVariants[i];v.images.splice(j,1);syncVariantTitleImage(v);renderMaterialVariantRows();});
  box.querySelectorAll("[data-remove-variant]").forEach(b=>b.onclick=()=>{
    editingMaterialVariants.splice(+b.dataset.removeVariant,1);
    renderMaterialVariantRows();
    toggleMaterialFamilyMode();
  });
  toggleMaterialFamilyMode();
}
function selectionKey(materialId,variantId=""){return variantId?`${materialId}::${variantId}`:materialId;}
export function resolveMaterialSelection(value){
  if(!value)return null;const [materialId,variantId]=String(value).split("::");const material=state.materials.find(m=>m.id===materialId);if(!material)return null;
  const variant=variantId?(material.variants||[]).find(v=>v.id===variantId):null;
  return variant?{...material,...variant,id:selectionKey(material.id,variant.id),materialId:material.id,variantId:variant.id,name:`${material.name} – ${variant.name}`,baseMaterial:material}:material;
}
export function materialSelections(area=null,role="main"){
  const out=[];state.materials.filter(m=>(!area||m.area===area)&&(role!=="main"||m.mainRole!==false)).forEach(m=>{
    if((m.variants||[]).length)m.variants.forEach(v=>out.push(resolveMaterialSelection(selectionKey(m.id,v.id))));else out.push(m);
  });return out.filter(Boolean).sort((a,b)=>(b.favorite-a.favorite)||(b.baseMaterial?.favorite-a.baseMaterial?.favorite)||a.name.localeCompare(b.name,"de"));
}
function adjustStock(materialId,variantId=""){
  const m=state.materials.find(x=>x.id===materialId);if(!m)return;const target=variantId?(m.variants||[]).find(v=>v.id===variantId):m;if(!target)return;
  const raw=prompt(`Bestand ändern: ${m.name}${variantId?" – "+target.name:""}\nPositive Zahl = Zugang, negative Zahl = Abgang`,"-1");if(raw===null)return;const change=num(raw);if(!change)return;
  const reason=prompt("Grund (z. B. Ausschuss, Privat verschenkt, Wareneingang, Inventur)",change>0?"Wareneingang":"Ausschuss")||"Manuelle Korrektur";
  target.trackStock=true;target.stock=num(target.stock)+change;target.stockHistory=Array.isArray(target.stockHistory)?target.stockHistory:[];target.stockHistory.unshift({date:new Date().toISOString(),change,reason});save();renderMaterials();
}
function toggleFavorite(materialId,variantId=""){
  const m=state.materials.find(x=>x.id===materialId);if(!m)return;const target=variantId?(m.variants||[]).find(v=>v.id===variantId):m;if(!target)return;target.favorite=!target.favorite;save();renderMaterials();
}

function openMaterial(m=null){
  $("materialDialogTitle").textContent=m?"Material bearbeiten":"Material hinzufügen";
  $("materialId").value=m?.id||"";
  $("materialName").value=m?.name||"";
  $("materialArea").value=m?.area||"3D-Druck";
  renderMaterialCategorySelect(m?.category||inferMaterialCategory(m||{area:"3D-Druck",name:""}));
  $("materialSupplier").value=m?.supplier||"";
  $("materialManufacturer").value=m?.manufacturer||"";
  $("materialColor").value=m?.color||"";
  $("materialLocation").value=m?.location||"";
  materialImageData=m?.image||"";renderMaterialImagePreview();
  $("materialWidth").value=m?.width||"";$("materialHeight").value=m?.height||"";$("materialDimensionUnit").value=m?.dimensionUnit||"cm";$("materialSheetCount").value=m?.sheetCount||1;
  $("materialPrice").value=m?.price??"";
  $("materialQuantity").value=m?.quantity??"";
  $("materialSalePrice").value=m?.salePrice??"";
  $("materialStock").value=m?.stock??"";
  $("materialMinStock").value=m?.minStock??"";
  $("materialQrCode").value=m?.qrCode||"";
  $("materialUnit").value=m?.unit||"g";
  $("materialNote").value=m?.note||"";
  editingMaterialVariants=(m?.variants||[]).map(v=>normalizeVariant(v,m));renderMaterialVariantRows();toggleMaterialFamilyMode();
  $("materialMainRole").checked=m?m.mainRole!==false:true;
  $("materialConsumableRole").checked=m?Boolean(m.consumableRole):false;
  $("materialWorkshopUnit").value=m?.workshopUnit||m?.unit||"";
  $("materialWorkshopUnitAmount").value=m?.workshopUnitAmount??1;
  $("consumptionSmall").value=m?.consumptionLevels?.small??(m?.scaleWithSize?num(m?.defaultConsumption)*(num(m?.sizeFactors?.small)||0.5):m?.defaultConsumption??"");
  $("consumptionMedium").value=m?.consumptionLevels?.medium??m?.defaultConsumption??"";
  $("consumptionLarge").value=m?.consumptionLevels?.large??(m?.scaleWithSize?num(m?.defaultConsumption)*(num(m?.sizeFactors?.large)||2):m?.defaultConsumption??"");
  $("materialAutoAdd").checked=m?Boolean(m.autoAdd):false;
  $("materialFavorite").checked=m?Boolean(m.favorite):false;
  $("materialConsumableCategory").value=m?.consumableCategory||"Sonstiges";
  const modules=m?.consumableModules||["3d","laser","vinyl","textil"];
  document.querySelectorAll("[data-consumable-module]").forEach(cb=>cb.checked=modules.includes(cb.value));
  toggleConsumableFields();toggleMaterialAreaBox();updateMaterialAreaHint();
  previewUnit();updateWorkshopUnitSentence();
  dialog.showModal();
}
function previewUnit(){
  const q=num($("materialQuantity").value),p=num($("materialPrice").value);
  $("unitPreview").textContent=q>0?`${euro(p/q)} / ${$("materialUnit").value}`:"0,00 €";
}
$("materialForm").onsubmit=e=>{
  e.preventDefault();
  const name=$("materialName").value.trim(),price=num($("materialPrice").value),quantity=num($("materialQuantity").value);
  const hasVariants=editingMaterialVariants.some(v=>v.name.trim());
  if(!name){alert("Bitte einen Materialnamen eingeben.");return}
  if(!hasVariants&&quantity<=0){alert("Bitte eine gültige gekaufte Menge eingeben.");return}
  if(hasVariants){
    const invalid=editingMaterialVariants.filter(v=>v.name.trim()).some(v=>num(v.quantity)<=0);
    if(invalid){alert("Bitte bei jeder Variante eine gültige gekaufte Menge eingeben.");return}
  }
  const modules=[...document.querySelectorAll("[data-consumable-module]:checked")].map(cb=>cb.value);
  const item={
    id:$("materialId").value||uid(),name,area:$("materialArea").value,category:$("materialCategory").value||"Sonstiges",supplier:$("materialSupplier").value.trim(),manufacturer:$("materialManufacturer").value.trim(),color:$("materialColor").value.trim(),location:$("materialLocation").value.trim(),image:hasVariants?"":materialImageData,
    width:hasVariants?0:num($("materialWidth").value),height:hasVariants?0:num($("materialHeight").value),dimensionUnit:$("materialDimensionUnit").value,sheetCount:hasVariants?1:Math.max(1,num($("materialSheetCount").value)),
    price:hasVariants?0:price,quantity:hasVariants?1:quantity,unit:$("materialUnit").value,salePrice:num($("materialSalePrice").value),stock:num($("materialStock").value),minStock:num($("materialMinStock").value),trackStock:num($("materialStock").value)>0||num($("materialMinStock").value)>0,qrCode:$("materialQrCode").value.trim(),
    note:$("materialNote").value.trim(),unitPrice:hasVariants?0:price/quantity,variants:editingMaterialVariants.filter(v=>v.name.trim()).map(v=>normalizeVariant(v,{unit:$("materialUnit").value})),stockHistory:state.materials.find(x=>x.id===$("materialId").value)?.stockHistory||[],mainRole:$("materialMainRole").checked,consumableRole:$("materialConsumableRole").checked,
    consumableCategory:$("materialConsumableCategory").value,defaultConsumption:num($("consumptionMedium").value),
    workshopUnit:$("materialWorkshopUnit").value.trim()||$("materialUnit").value,workshopUnitAmount:num($("materialWorkshopUnitAmount").value)||1,
    consumptionLevels:{small:num($("consumptionSmall").value),medium:num($("consumptionMedium").value),large:num($("consumptionLarge").value)},
    autoAdd:$("materialAutoAdd").checked,favorite:$("materialFavorite").checked,scaleWithSize:true,
    consumableModules:modules.length?modules:["3d","laser","vinyl","textil"],
    sizeFactors:{small:1,medium:1,large:1}
  };
  const i=state.materials.findIndex(x=>x.id===item.id); if(i>=0) state.materials[i]=item; else state.materials.push(item);
  save();dialog.close();renderMaterials();
};
export function renderMaterials(){
  renderMaterialCategoryFilter();
  const term=$("materialSearch").value.toLowerCase().trim(),area=$("materialAreaFilter").value,category=$("materialCategoryFilter").value;
  let list=state.materials.filter(m=>{
    const variantText=(m.variants||[]).map(v=>`${v.name} ${v.note||""} ${v.location||""} ${v.supplier||""} ${v.properties||""}`).join(" ");
    const hay=`${m.name} ${m.note||""} ${m.supplier||""} ${m.manufacturer||""} ${m.color||""} ${m.location||""} ${m.qrCode||""} ${inferMaterialCategory(m)} ${variantText}`.toLowerCase();
    return (!term||hay.includes(term))&&(!area||m.area===area)&&(!category||inferMaterialCategory(m)===category);
  });
  if(materialListMode==="favorites")list=list.filter(m=>m.favorite||(m.variants||[]).some(v=>v.favorite));
  if(materialListMode==="recent")list=list.filter(m=>m.lastUsed).sort((a,b)=>new Date(b.lastUsed)-new Date(a.lastUsed));
  else list.sort((a,b)=>(b.favorite-a.favorite)||inferMaterialCategory(a).localeCompare(inferMaterialCategory(b),"de")||a.name.localeCompare(b.name,"de"));
  const groups=new Map();
  list.forEach(m=>{const c=inferMaterialCategory(m);if(!groups.has(c))groups.set(c,[]);groups.get(c).push(m)});
  $("materialList").innerHTML=list.length?[...groups.entries()].map(([cat,items],groupIndex)=>`
    <details class="material-category card">
      <summary><span>${esc(cat)}</span><small>${items.length} ${items.length===1?"Material":"Materialien"}</small></summary>
      <div class="material-category-items">${items.map(m=>`
        <article class="material-item-compact ${(m.variants||[]).length?"material-family-item":""} ${(m.trackStock&&num(m.stock)<=num(m.minStock))||(m.variants||[]).some(v=>v.trackStock&&num(v.stock)<=num(v.minStock))?"low-stock":""}">
          ${(m.variants||[]).length?"":(m.image?`<img class="material-thumb" src="${m.image}" alt="">`:`<div class="material-thumb material-thumb-empty">${m.favorite?"★":"▦"}</div>`)}
          <div class="material-main"><div class="item-title">${m.favorite?"★ ":""}${esc(m.name)}</div><div class="item-meta">${esc(m.area)}${m.supplier?" · "+esc(m.supplier):""}${m.note?" · "+esc(m.note):""}</div><div class="material-role-tags">${(m.variants||[]).length?'<span>Materialfamilie</span>':''}${m.mainRole!==false?'<span>Hauptmaterial</span>':''}${m.consumableRole?'<span>Verbrauch</span>':''}${m.lastUsed?`<span>Zuletzt ${new Date(m.lastUsed).toLocaleDateString("de-DE")}</span>`:""}</div>
          ${(m.variants||[]).length?`<div class="variant-list">${m.variants.map(v=>`<div class="variant-card-mini">${v.image?`<img class="variant-mini-thumb" src="${v.image}" alt="">`:`<div class="variant-mini-thumb variant-image-placeholder">🖼️</div>`}<div><strong>${v.favorite?"★ ":""}${esc(v.name)}</strong><small>${euro(v.unitPrice)}/${esc(v.unit)}${v.trackStock?` · ${num(v.stock)} Stk.${num(v.stock)<=num(v.minStock)?' ⚠️':''}`:""}${v.properties?` · ${esc(v.properties)}`:""}${v.location?` · ${esc(v.location)}`:""}</small></div></div>`).join("")}</div>`:""}</div>
          <div class="material-price-block"><strong>${(m.variants||[]).length?`${m.variants.length} Varianten`:euro(m.unitPrice)}</strong><small>${(m.variants||[]).length?"":`/${esc(m.unit)}`}</small></div>
          <div class="material-compact-actions"><button data-favorite-material="${m.id}" class="favorite-toggle" title="Favorit">${m.favorite?"★":"☆"}</button><button data-edit="${m.id}">Bearbeiten</button>${!(m.variants||[]).length&&m.trackStock?`<button data-stock-material="${m.id}">Bestand ${num(m.stock)}</button>`:""}<button data-delete="${m.id}" class="danger">Löschen</button></div>
          ${(m.variants||[]).length?`<div class="material-stock-actions">${m.variants.map(v=>`<button data-favorite-variant="${m.id}::${v.id}" class="ghost small">${v.favorite?"★":"☆"} ${esc(v.name)}</button>${v.trackStock?`<button data-stock-variant="${m.id}::${v.id}" class="ghost small">± Bestand (${num(v.stock)})</button>`:""}`).join("")}</div>`:""}
        </article>`).join("")}</div>
    </details>`).join(""):`<div class="empty-state">Keine passenden Materialien gefunden.</div>`;
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openMaterial(state.materials.find(m=>m.id===b.dataset.edit)));
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{if(confirm("Material wirklich löschen?")){state.materials=state.materials.filter(m=>m.id!==b.dataset.delete);save();renderMaterials()}});
  document.querySelectorAll("[data-favorite-material]").forEach(b=>b.onclick=()=>toggleFavorite(b.dataset.favoriteMaterial));
  document.querySelectorAll("[data-favorite-variant]").forEach(b=>b.onclick=()=>{const [m,v]=b.dataset.favoriteVariant.split("::");toggleFavorite(m,v)});
  document.querySelectorAll("[data-stock-material]").forEach(b=>b.onclick=()=>adjustStock(b.dataset.stockMaterial));
  document.querySelectorAll("[data-stock-variant]").forEach(b=>b.onclick=()=>{const [m,v]=b.dataset.stockVariant.split("::");adjustStock(m,v)});
  const categoryElements=[...document.querySelectorAll(".material-category")];
  categoryElements.forEach(group=>{
    group.open=allMaterialGroupsOpen;
    group.addEventListener("toggle",()=>{
      if(group.open&&!allMaterialGroupsOpen){
        categoryElements.forEach(other=>{if(other!==group)other.open=false;});
      }
    });
  });
  if($("toggleMaterialGroupsBtn")) $("toggleMaterialGroupsBtn").textContent=allMaterialGroupsOpen?"Alle einklappen":"Alle ausklappen";
}
