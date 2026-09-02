import { state } from "./storage.js?v=6.6.14";

const clamp=value=>Math.max(0,Number.isFinite(Number(value))?Number(value):0);

function ratePerMinute(machine,activity){
  if(!machine)return 0;
  if(activity==="cut")return clamp(machine.cutRate)||clamp(machine.minuteRate)||clamp(machine.hourlyRate)/60||clamp(machine.hourlyCost)/60||clamp(machine.costPerHour)/60||clamp(machine.machineHourlyRate)/60;
  if(activity==="engrave")return clamp(machine.engraveRate)||clamp(machine.minuteRate)||clamp(machine.hourlyRate)/60||clamp(machine.hourlyCost)/60||clamp(machine.costPerHour)/60||clamp(machine.machineHourlyRate)/60;
  return clamp(machine.minuteRate)||clamp(machine.hourlyRate)/60||clamp(machine.hourlyCost)/60||clamp(machine.costPerHour)/60||clamp(machine.machineHourlyRate)/60;
}

function costProfileLabel(machine,activity){
  const rate=ratePerMinute(machine,activity);
  if(!machine)return "Keine Maschine ausgewählt";
  if(activity==="cut")return `Schneiden · ${rate.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €/Min.`;
  if(activity==="engrave")return `Gravieren · ${rate.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €/Min.`;
  return `Maschinenzeit · ${rate.toLocaleString("de-DE",{minimumFractionDigits:2,maximumFractionDigits:2})} €/Min.`;
}

function refreshCost(form){
  const machine=(state.machines||[]).find(m=>m.id===form.elements.machineId?.value);
  const activity=form.elements.activity?.value;
  const minutes=clamp(form.elements.machineMinutes?.value);
  const rate=ratePerMinute(machine,activity);
  if(form.elements.machineCost)form.elements.machineCost.value=(rate*minutes).toFixed(2);
  const field=form.querySelector("[data-position-profile]");
  if(field){
    field.childNodes[0].nodeValue="Kostenprofil";
    let input=form.elements.profileName;
    if(!input){
      input=document.createElement("input");
      input.name="profileName";
      field.append(input);
    }
    if(input.tagName==="SELECT"){
      const replacement=document.createElement("input");
      replacement.name="profileName";
      input.replaceWith(replacement);
      input=replacement;
    }
    input.type="text";
    input.readOnly=true;
    input.value=costProfileLabel(machine,activity);
    input.dataset.profileId="";
  }
}

function enhance(form){
  if(form.dataset.machineCostProfileFix)return;
  form.dataset.machineCostProfileFix="1";
  const machine=form.elements.machineId;
  const activity=form.elements.activity;
  const minutes=form.elements.machineMinutes;
  machine?.addEventListener("change",()=>refreshCost(form));
  activity?.addEventListener("change",()=>setTimeout(()=>refreshCost(form),0));
  minutes?.addEventListener("input",()=>refreshCost(form));
  refreshCost(form);
}

const observer=new MutationObserver(()=>{
  const form=document.getElementById("positionEditorForm");
  if(form)enhance(form);
});
observer.observe(document.documentElement,{childList:true,subtree:true});
