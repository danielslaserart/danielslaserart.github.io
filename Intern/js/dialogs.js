import { esc } from "./utils.js?v=6.4.7";

const dialog=document.getElementById("appDialog");
const title=document.getElementById("appDialogTitle");
const message=document.getElementById("appDialogMessage");
const fields=document.getElementById("appDialogFields");
const error=document.getElementById("appDialogError");
const cancel=document.getElementById("appDialogCancel");
const accept=document.getElementById("appDialogAccept");

function parseDecimal(value){
  const raw=String(value??"").trim();
  if(raw==="")return null;
  const parsed=Number(raw.replace(",","."));
  return Number.isFinite(parsed)?parsed:NaN;
}

function openDialog(options={}){
  return new Promise(resolve=>{
    title.textContent=options.title||"Hinweis";
    message.textContent=options.message||"";
    message.classList.toggle("hidden",!options.message);
    error.textContent="";
    fields.innerHTML=(options.fields||[]).map(field=>{
      const type=field.type==="textarea"?"textarea":field.type==="select"?"select":"input";
      const attrs=type==="input"?`type="${field.type||"text"}" inputmode="${field.inputmode||"text"}"`:"";
      const content=type==="textarea"?esc(field.value??""):type==="select"?(field.options||[]).map(o=>`<option value="${esc(o.value)}"${String(o.value)===String(field.value)?" selected":""}>${esc(o.label)}</option>`).join(""):"";
      const value=type==="input"&&field.type!=="checkbox"?`value="${esc(field.value??"")}"`:"";
      return `<label class="${field.type==="checkbox"?"dialog-checkbox":""}">${field.type==="checkbox"?`<input data-dialog-field="${esc(field.name)}" type="checkbox" ${field.value?"checked":""}>${esc(field.label)}`:`${esc(field.label)}${type==="textarea"?`<textarea data-dialog-field="${esc(field.name)}" rows="${field.rows||3}">${content}</textarea>`:type==="select"?`<select data-dialog-field="${esc(field.name)}">${content}</select>`:`<input data-dialog-field="${esc(field.name)}" ${attrs} ${value} placeholder="${esc(field.placeholder||"")}">`}`}</label>`;
    }).join("");
    cancel.textContent=options.cancelText||"Abbrechen";
    cancel.classList.toggle("hidden",options.cancelText===null);
    accept.textContent=options.acceptText||"OK";
    const finish=value=>{dialog.close();resolve(value)};
    cancel.onclick=()=>finish(null);
    accept.onclick=async()=>{
      const values={};
      fields.querySelectorAll("[data-dialog-field]").forEach(el=>values[el.dataset.dialogField]=el.type==="checkbox"?el.checked:el.value);
      const validation=options.validate?.(values,parseDecimal);
      if(validation){error.textContent=validation;return;}
      if(options.onSubmit){
        accept.disabled=true;
        try{
          await options.onSubmit(values);
        }catch(submitError){
          console.error("Formular konnte nicht gespeichert werden:",submitError);
          error.textContent=submitError?.message||"Die Änderungen konnten nicht gespeichert werden.";
          accept.disabled=false;
          return;
        }
        accept.disabled=false;
      }
      finish(options.fields?values:true);
    };
    dialog.onclick=e=>{if(e.target===dialog&&options.cancelText!==null)finish(null)};
    try{dialog.showModal()}catch{dialog.setAttribute("open","")}
    requestAnimationFrame(()=>fields.querySelector("input,textarea,select")?.focus());
  });
}

export function appAlert(messageText,titleText="Hinweis"){
  return openDialog({title:titleText,message:messageText,cancelText:null,acceptText:"OK"});
}
export function appConfirm(messageText,titleText="Bitte bestätigen",acceptText="Bestätigen",cancelText="Abbrechen"){
  return openDialog({title:titleText,message:messageText,cancelText,acceptText});
}
export async function appPrompt(messageText,defaultValue="",titleText="Eingabe"){
  const result=await openDialog({title:titleText,message:messageText,fields:[{name:"value",label:"Eingabe",value:defaultValue}],cancelText:"Abbrechen",acceptText:"Übernehmen"});
  return result?.value??null;
}
export function appForm(options){return openDialog(options)}
export { parseDecimal };
