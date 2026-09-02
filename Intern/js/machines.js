import { $, num, esc } from "./utils.js?v=6.6.16";
import { state, save } from "./storage.js?v=6.6.16";
import { renderMotifEstimator } from "./estimator.js?v=6.6.16";
function machineOptions(type,selected=""){
  const list=(state.machines||[]).filter(m=>m.type===type&&m.active!==false);
  return `<option value="">Keine Maschine ausgewählt</option>`+list.map(m=>`<option value="${m.id}" ${m.id===selected?"selected":""}>${esc(m.name)}</option>`).join("");
}
function getMachine(){
  const id=$("machineSelect")?.value;
  return (state.machines||[]).find(m=>m.id===id)||null;
}
export function renderMachines(){
  const box=$("machineList");if(!box)return;
  box.innerHTML=(state.machines||[]).map(m=>`<div class="machine-row card"><div>${m.image?`<img class="machine-thumb" src="${esc(m.image)}" alt="">`:""}<strong>${esc(m.name)}</strong><small>${m.type==="laser"?"Laser":"3D-Druck"}</small></div><label>Minutenpreis<input data-machine-field="minuteRate" data-machine-id="${m.id}" type="number" min="0" step="any" value="${num(m.minuteRate)||(m.type==="3d"?num(m.hourlyRate)/60:0)}"></label>${m.type==="laser"?`<label>Gravur €/Min.<input data-machine-field="engraveRate" data-machine-id="${m.id}" type="number" min="0" step="any" value="${num(m.engraveRate)}"></label><label>Schnitt €/Min.<input data-machine-field="cutRate" data-machine-id="${m.id}" type="number" min="0" step="any" value="${num(m.cutRate)}"></label><label>Gravur mm/min<input data-machine-field="engraveSpeed" data-machine-id="${m.id}" type="number" min="0" step="any" value="${num(m.engraveSpeed)}"></label><label>Schnitt mm/min<input data-machine-field="cutSpeed" data-machine-id="${m.id}" type="number" min="0" step="any" value="${num(m.cutSpeed)}"></label>`:`<label>Kosten €/Std.<input data-machine-field="hourlyRate" data-machine-id="${m.id}" type="number" min="0" step="any" value="${num(m.hourlyRate)}"></label>`}<label>Arbeitsfläche B (mm)<input data-machine-field="workWidth" data-machine-id="${m.id}" type="number" min="0" value="${num(m.workWidth)}"></label><label>Arbeitsfläche H (mm)<input data-machine-field="workHeight" data-machine-id="${m.id}" type="number" min="0" value="${num(m.workHeight)}"></label><label>Wartungsintervall (Std.)<input data-machine-field="maintenanceInterval" data-machine-id="${m.id}" type="number" min="0" value="${num(m.maintenanceInterval)}"></label><label>Letzte Wartung<input data-machine-field="lastMaintenance" data-machine-id="${m.id}" type="date" value="${esc(m.lastMaintenance||"")}"></label><label>Betriebsstunden<input data-machine-field="operatingHours" data-machine-id="${m.id}" type="number" min="0" step="any" value="${num(m.operatingHours)}"></label><label>Bild-URL<input data-machine-field="image" data-machine-id="${m.id}" type="url" value="${esc(m.image||"")}" placeholder="optional"></label></div>`).join("");
  document.querySelectorAll("[data-machine-field]").forEach(el=>el.onchange=()=>{const m=state.machines.find(x=>x.id===el.dataset.machineId);if(m){m[el.dataset.machineField]=el.type==="number"?num(el.value):el.value;save();renderMotifEstimator();}});
}
