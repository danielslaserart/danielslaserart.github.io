import { state } from "./storage.js?v=6.5";
import { resolveMaterialSelection } from "./materials.js?v=6.5";
import { effectiveProfiles } from "./processing-profiles.js?v=6.5";

const clamp=value=>Math.max(0,Number.isFinite(Number(value))?Number(value):0);
const processType=activity=>activity==="cut"?"cutting":activity==="engrave"?"vectorEngraving":"";
const hourly=machine=>clamp(machine?.hourlyCost??machine?.costPerHour??machine?.machineHourlyRate);

function materialId(form){
  const value=form.elements.managedMaterial?.value||"";
  const selection=resolveMaterialSelection(value);
  return selection?.variantId||selection?.materialId||selection?.id||value.split("::").pop()||"";
}

function refreshCost(form){
  const machine=(state.machines||[]).find(m=>m.id===form.elements.machineId?.value);
  const minutes=clamp(form.elements.machineMinutes?.value);
  if(form.elements.machineCost)form.elements.machineCost.value=(hourly(machine)*minutes/60).toFixed(2);
}

function refreshProfiles(form,keep=true){
  const label=form.querySelector("[data-position-profile]");
  if(!label)return;
  const activity=form.elements.activity?.value;
  if(!["cut","engrave"].includes(activity))return;
  let select=form.elements.profileId;
  const oldInput=form.elements.profileName;
  const previous=keep?(select?.value||oldInput?.dataset.profileId||""):"";
  if(!select){
    select=document.createElement("select");
    select.name="profileId";
    oldInput?.replaceWith(select);
  }
  const profiles=effectiveProfiles(materialId(form),{machineId:form.elements.machineId?.value||"",processType:processType(activity)});
  select.innerHTML='<option value="">Profil auswählen …</option>'+profiles.map(p=>`<option value="${p.id}">${p.name}</option>`).join("");
  if(previous&&profiles.some(p=>p.id===previous))select.value=previous;
  else {
    const preferred=profiles.find(p=>p.isDefault)||profiles.find(p=>p.status==="preferred");
    if(preferred)select.value=preferred.id;
  }
  select.onchange=()=>{select.dataset.profileName=profiles.find(p=>p.id===select.value)?.name||"";};
  select.dataset.profileName=profiles.find(p=>p.id===select.value)?.name||"";
}

function enhance(form){
  if(form.dataset.profileFix66)return;
  form.dataset.profileFix66="1";
  refreshProfiles(form);
  const machine=form.elements.machineId;
  const material=form.elements.managedMaterial;
  const activity=form.elements.activity;
  const minutes=form.elements.machineMinutes;
  machine?.addEventListener("change",()=>{refreshProfiles(form,false);refreshCost(form)});
  material?.addEventListener("change",()=>refreshProfiles(form,false));
  activity?.addEventListener("change",()=>setTimeout(()=>refreshProfiles(form,false),0));
  minutes?.addEventListener("input",()=>refreshCost(form));
  form.addEventListener("submit",()=>{
    const select=form.elements.profileId;
    if(!select)return;
    let hidden=form.elements.profileName;
    if(!hidden){hidden=document.createElement("input");hidden.type="hidden";hidden.name="profileName";form.append(hidden);}
    hidden.value=select.dataset.profileName||select.options[select.selectedIndex]?.text||"";
  },true);
  refreshCost(form);
}

const observer=new MutationObserver(()=>{
  const form=document.getElementById("positionEditorForm");
  if(form)enhance(form);
});
observer.observe(document.documentElement,{childList:true,subtree:true});
