import { state } from "./storage.js?v=6.6.12";

const money=n=>(Math.max(0,Number(n)||0)).toFixed(2);

function nextPositionLabel(){
  const projectId=document.body.dataset.editingProjectId||state.editingProjectId||state.currentProjectId;
  const project=(state.projects||[]).find(p=>p.id===projectId);
  const positions=Array.isArray(project?.positions)?project.positions:[];
  return `Position ${positions.length+1}`;
}

function enhance(form){
  if(form.dataset.editorFix66)return;
  form.dataset.editorFix66="1";
  const label=form.elements.label;
  if(label&&/^Position 1$/.test(label.value.trim()))label.value=nextPositionLabel();

  const quantity=form.elements.quantity;
  const cost=form.elements.materialCost;
  const radios=[...form.querySelectorAll('[name="materialSource"]')];
  let unitPrice=null;
  const source=()=>new FormData(form).get("materialSource")||"manual";
  const captureUnitPrice=()=>{
    if(source()!=="manual")return;
    const q=Math.max(0,Number(quantity?.value)||0);
    const total=Math.max(0,Number(cost?.value)||0);
    unitPrice=q>0?total/q:total;
  };
  const recalc=()=>{
    if(source()!=="manual"||unitPrice===null||!cost)return;
    cost.value=money(unitPrice*(Math.max(0,Number(quantity?.value)||0));
  };
  if(quantity&&cost){
    captureUnitPrice();
    cost.addEventListener("change",captureUnitPrice);
    cost.addEventListener("input",()=>{
      if(source()!=="manual")return;
      const q=Math.max(0,Number(quantity.value)||0);
      const total=Math.max(0,Number(cost.value)||0);
      unitPrice=q>0?total/q:total;
    });
    quantity.addEventListener("focus",captureUnitPrice);
    quantity.addEventListener("input",recalc);
    quantity.addEventListener("change",recalc);
    radios.forEach(r=>r.addEventListener("change",()=>{unitPrice=null;if(source()==="manual")captureUnitPrice();}));
  }
}

const observer=new MutationObserver(()=>{
  const form=document.getElementById("positionEditorForm");
  if(form)enhance(form);
});
observer.observe(document.documentElement,{childList:true,subtree:true});
