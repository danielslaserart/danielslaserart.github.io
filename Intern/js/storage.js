import { $, num, uid, inferMaterialCategory } from "./utils.js";
import { appConfirm } from "./dialogs.js";
const SUPABASE_URL = "https://qsnlwppbcczjwxwuhbkv.supabase.co";
const SUPABASE_KEY = "sb_publishable_R0Y-88wMebNVn580N5DvlQ_1xYezwhU";
const SUPABASE_SCRIPT_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
let db = null;
let currentUser = null;
let cloudReady = false;
let saveTimer = null;
let logoutRequested = false;
let authInitializing = false;
let authListenerRegistered = false;
let enteringApp = false;

function withTimeout(promise,milliseconds,message){
  let timer;
  return Promise.race([
    promise,
    new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error(message)),milliseconds);
    })
  ]).finally(()=>clearTimeout(timer));
}

async function ensureSupabaseLibrary(){
  if(window.supabase?.createClient)return;
  const existing=document.getElementById("supabaseScript");
  if(existing?.dataset.loaded==="true"&&window.supabase?.createClient)return;
  if(existing)existing.remove();
  await withTimeout(new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.id="supabaseScript";
    script.src=SUPABASE_SCRIPT_URL;
    script.onload=()=>{
      script.dataset.loaded="true";
      window.supabase?.createClient?resolve():reject(new Error("Supabase-Bibliothek ist unvollständig."));
    };
    script.onerror=()=>reject(new Error("Supabase-Bibliothek konnte nicht geladen werden."));
    document.head.appendChild(script);
  }),8000,"Zeitüberschreitung beim Laden der Supabase-Bibliothek.");
}

async function createSupabaseClient(){
  if(db)return db;
  await ensureSupabaseLibrary();
  if(!window.supabase?.createClient){
    throw new Error("Supabase-Bibliothek wurde nicht geladen.");
  }
  db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{
    auth:{
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true,
      storage:window.localStorage,
      storageKey:"sb-qsnlwppbcczjwxwuhbkv-auth-token"
    }
  });
  return db;
}

const KEY = "dla_kalkulator_v3";
const APP_VERSION = "4.14.0";
const VERSION_KEY = "dla_app_version";
if (localStorage.getItem(VERSION_KEY) !== APP_VERSION) {
  if ("caches" in window) {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))).catch(() => {});
  }
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister());
    }).catch(() => {});
  }
  localStorage.setItem(VERSION_KEY, APP_VERSION);
}

export const defaults = {
  settings:{
    profit:30,hourly:0,machine3d:0.5,laserGravur:0.1,laserSchnitt:0.15,
    plotter:0.1,presse:0.15,reserve:5,packaging:0,rounding:0.1,
    overhead:0,electricity:0.35,defaultMachine:"",defaultMaterial:"",
    design:{hourlyRate:35,minimumFee:0},
    customerObject:{
      baseFee:15,minimumPrice:15,expressFee:0,
      difficulties:{veryEasy:0,easy:5,normal:10,hard:20,veryHard:35},
      risks:{under50:0,from50To100:3,from100To250:5,from250To500:8,over500:12}
    }
  },
  materials:[],processingProfiles:[],projects:[],templates:[],learningRecords:[],motifEstimator:{calibrationFactor:1,samples:0,lastDetected:"high"},activeModule:"3d",lastPrice:null,timer:{running:false,startedAt:null,elapsed:0},
  machines:[
    {id:"xtool-f2-diode",name:"xTool F2 – Diode",type:"laser",engraveRate:0.10,cutRate:0.15,engraveSpeed:6000,cutSpeed:300,active:true},
    {id:"xtool-f2-ir",name:"xTool F2 – IR",type:"laser",engraveRate:0.10,cutRate:0.15,engraveSpeed:6000,cutSpeed:0,active:true},
    {id:"atomstack-x70",name:"Atomstack X70 Pro",type:"laser",engraveRate:0.10,cutRate:0.15,engraveSpeed:6000,cutSpeed:500,active:true},
    {id:"anycubic-k3",name:"Anycubic K3 Combo",type:"3d",hourlyRate:0.50,active:true},
    {id:"anycubic-kobra2plus",name:"Anycubic Kobra 2 Plus",type:"3d",hourlyRate:0.50,active:true}
  ]
};
export let state = load();
state.processingProfiles=normalizeProcessingProfiles(state.processingProfiles);
state.templates=Array.isArray(state.templates)?state.templates:[];
state.projects=(state.projects||[]).map(normalizeProjectRecord);
state.learningRecords=(Array.isArray(state.learningRecords)?state.learningRecords:[]).map(normalizeLearningRecord);
migrateEmbeddedReferences(state);
localStorage.setItem(KEY,JSON.stringify(state));
state.timer={...defaults.timer,...(state.timer||{})};
state.motifEstimator={...defaults.motifEstimator,...(state.motifEstimator||{})};
state.machines=(state.machines||[]).map(m=>{const d=defaults.machines.find(x=>x.id===m.id)||{};return {...d,...m,engraveSpeed:num(m.engraveSpeed)||num(d.engraveSpeed),cutSpeed:num(m.cutSpeed)||num(d.cutSpeed)};});

export function load(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY));
    const merged={...defaults,...saved,settings:mergeSettings(saved?.settings)};
    merged.learningRecords=(Array.isArray(merged.learningRecords)?merged.learningRecords:[]).map(normalizeLearningRecord);
    merged.materials=(merged.materials||[]).map(m=>({
      ...m,
      mainRole:m.mainRole!==false,
      consumableRole:Boolean(m.consumableRole||m.area==="Sonstiges"),
      consumableCategory:m.consumableCategory||"Sonstiges",
      defaultConsumption:num(m.defaultConsumption),
      autoAdd:Boolean(m.autoAdd),
      favorite:Boolean(m.favorite),
      variants:Array.isArray(m.variants)?m.variants.map(v=>({...v,id:v.id||uid(),name:v.name||"Variante",price:num(v.price),quantity:num(v.quantity)||1,unit:v.unit||m.unit||"Stück",unitPrice:num(v.unitPrice)||(num(v.quantity)>0?num(v.price)/num(v.quantity):0),trackStock:Boolean(v.trackStock),stock:num(v.stock),minStock:num(v.minStock),favorite:Boolean(v.favorite),images:Array.isArray(v.images)?v.images:(v.image?[v.image]:[]),image:v.image||v.images?.[0]||"",note:v.note||"",location:v.location||"",supplier:v.supplier||"",properties:v.properties||"",stockHistory:Array.isArray(v.stockHistory)?v.stockHistory:[]})):[],
      stockHistory:Array.isArray(m.stockHistory)?m.stockHistory:[],trackStock:Boolean(m.trackStock),stock:num(m.stock),minStock:num(m.minStock),
      category:inferMaterialCategory(m),supplier:m.supplier||"",image:m.image||"",lastUsed:m.lastUsed||null,
      width:num(m.width),height:num(m.height),dimensionUnit:m.dimensionUnit||"cm",sheetCount:num(m.sheetCount)||1,
      consumableModules:Array.isArray(m.consumableModules)&&m.consumableModules.length?m.consumableModules:["3d","laser","vinyl","textil"],
      scaleWithSize:Boolean(m.scaleWithSize),
      workshopUnit:m.workshopUnit||m.unit||"Einheit",
      workshopUnitAmount:num(m.workshopUnitAmount)||1,
      consumptionLevels:{
        small:num(m.consumptionLevels?.small)||(Boolean(m.scaleWithSize)?num(m.defaultConsumption)*(num(m.sizeFactors?.small)||0.5):num(m.defaultConsumption)),
        medium:num(m.consumptionLevels?.medium)||num(m.defaultConsumption),
        large:num(m.consumptionLevels?.large)||(Boolean(m.scaleWithSize)?num(m.defaultConsumption)*(num(m.sizeFactors?.large)||2):num(m.defaultConsumption))
      },
      sizeFactors:{small:num(m.sizeFactors?.small)||0.5,medium:num(m.sizeFactors?.medium)||1,large:num(m.sizeFactors?.large)||2}
    }));
    merged.machines=Array.isArray(merged.machines)&&merged.machines.length?merged.machines:structuredClone(defaults.machines);
    merged.processingProfiles=normalizeProcessingProfiles(merged.processingProfiles);
    merged.projects=(merged.projects||[]).map(normalizeProjectRecord);
    migrateEmbeddedReferences(merged);
    return merged;
  }catch{return structuredClone(defaults)}
}
function normalizeNullableNumber(value){
  return value===null||value===undefined||value===""?null:num(value);
}
export function normalizeProcessingProfile(profile={}){
  if(!profile||typeof profile!=="object")return null;
  const scope=profile.scope==="material"?"material":"family";
  const settings=profile.settings&&typeof profile.settings==="object"?profile.settings:{};
  return {
    ...profile,
    id:String(profile.id||uid()),
    scope,
    familyId:String(profile.familyId||""),
    materialId:scope==="material"?String(profile.materialId||""):null,
    name:String(profile.name||"").trim(),
    machineId:String(profile.machineId||""),
    laserSource:String(profile.laserSource||""),
    processType:String(profile.processType||""),
    settings:{
      speed:normalizeNullableNumber(settings.speed),
      speedUnit:settings.speedUnit==="mm/s"?"mm/s":"mm/min",
      powerPercent:normalizeNullableNumber(settings.powerPercent),
      passes:settings.passes===null||settings.passes===undefined||settings.passes===""?1:Math.max(1,Math.round(num(settings.passes))),
      dpi:normalizeNullableNumber(settings.dpi),
      lineInterval:normalizeNullableNumber(settings.lineInterval),
      dotDuration:normalizeNullableNumber(settings.dotDuration),
      pulseDuration:normalizeNullableNumber(settings.pulseDuration),
      frequency:normalizeNullableNumber(settings.frequency),
      airAssist:settings.airAssist===true||settings.airAssist===false?settings.airAssist:null,
      airAssistValue:normalizeNullableNumber(settings.airAssistValue),
      bidirectional:settings.bidirectional===true||settings.bidirectional===false?settings.bidirectional:null,
      fillMethod:String(settings.fillMethod||""),
      rasterMethod:String(settings.rasterMethod||""),
      scanAngle:normalizeNullableNumber(settings.scanAngle),
      focusDistance:normalizeNullableNumber(settings.focusDistance),
      focusNote:String(settings.focusNote||""),
      zOffset:normalizeNullableNumber(settings.zOffset),
      materialThicknessMm:normalizeNullableNumber(settings.materialThicknessMm),
      layers:normalizeNullableNumber(settings.layers),
      interval:normalizeNullableNumber(settings.interval),
      printTemperature:normalizeNullableNumber(settings.printTemperature),
      bedTemperature:normalizeNullableNumber(settings.bedTemperature),
      feedRate:normalizeNullableNumber(settings.feedRate)
    },
    isDefault:Boolean(profile.isDefault),
    status:["untested","testing","proven","preferred","obsolete"].includes(profile.status)?profile.status:"untested",
    rating:profile.rating===null||profile.rating===undefined||profile.rating===""?null:Math.max(1,Math.min(5,Math.round(num(profile.rating)))),
    notes:String(profile.notes||""),
    createdAt:profile.createdAt||new Date().toISOString(),
    updatedAt:profile.updatedAt||profile.createdAt||new Date().toISOString()
  };
}
export function normalizeProcessingProfiles(profiles){
  return (Array.isArray(profiles)?profiles:[]).map(normalizeProcessingProfile).filter(Boolean);
}
export function normalizeProjectStatus(status){
  return ({open:"offer",payment:"waiting"}[status])||(["offer","progress","waiting","done","billed"].includes(status)?status:"offer");
}
export function normalizeProjectRecord(project={}){
  const clearlyGeneratedReference=project.reference===true&&project.estimatorData&&(
    project.notes==="Aus Angebotsassistent erstellt"||
    (project.tags||[]).includes("Schätzer")
  );
  const recordType=project.recordType==="reference"||clearlyGeneratedReference?"reference":"project";
  const estimatedPrice=project.estimatedPrice??(recordType==="reference"?num(project.sale):null);
  const actualPrice=project.actualPrice??(recordType==="project"?num(project.sale):null);
  const inferredCustomerObject=String(project.type||"").toLowerCase().includes("kundenobjekt");
  const orderType=["own","customerObject","service","design"].includes(project.orderType)?project.orderType:(project.projectType==="design"?"design":inferredCustomerObject?"customerObject":"own");
  return {
    ...project,
    recordType,
    orderType,
    customerObjectProcess:project.customerObjectProcess||null,
    objectValue:project.objectValue==null?null:num(project.objectValue),
    riskSurcharge:project.riskSurcharge==null?null:num(project.riskSurcharge),
    difficulty:project.difficulty||null,
    difficultyPercent:project.difficultyPercent==null?null:num(project.difficultyPercent),
    objectMaterial:project.objectMaterial||"",
    isReference:recordType==="reference",
    reference:recordType==="reference",
    estimatedPrice,
    actualPrice,
    estimatedTotalTime:project.estimatedTotalTime??(project.estimatorData?num(project.estimatorData.estimatedCutTime??project.estimatorData.cutMinutes)+num(project.estimatorData.estimatedEngravingTime??project.estimatorData.engraveMinutes):null),
    actualTotalTime:project.actualTotalTime==null?null:num(project.actualTotalTime),
    estimatedCutTime:project.estimatedCutTime??project.estimatorData?.estimatedCutTime??null,
    actualCutTime:project.actualCutTime==null?null:num(project.actualCutTime),
    estimatedEngravingTime:project.estimatedEngravingTime??project.estimatorData?.estimatedEngravingTime??null,
    actualEngravingTime:project.actualEngravingTime==null?null:num(project.actualEngravingTime),
    materialCost:project.materialCost??project.estimatorData?.materialCost??null,
    sale:recordType==="project"?num(actualPrice):num(project.sale),
    pinned:Boolean(project.pinned),
    status:recordType==="project"?normalizeProjectStatus(project.status):null,
    tags:Array.isArray(project.tags)?project.tags:(project.tags?String(project.tags).split(",").map(x=>x.trim()).filter(Boolean):[]),
    images:Array.isArray(project.images)?project.images:(project.image?[project.image]:[]),
    priceHistory:Array.isArray(project.priceHistory)?project.priceHistory:[],
    workSeconds:num(project.workSeconds)
  };
}
export function normalizeLearningRecord(record={}){
  const actualTotal=record.actualTotalTime??record.actualMinutes;
  return {
    ...record,
    recordType:"reference",
    orderType:["own","customerObject","service","design"].includes(record.orderType)?record.orderType:"own",
    isReference:true,
    estimatedPrice:record.estimatedPrice??num(record.sale),
    actualPrice:record.actualPrice==null?null:num(record.actualPrice),
    estimatedTotalTime:record.estimatedTotalTime??(num(record.estimatedCutTime??record.cutMinutes)+num(record.estimatedEngravingTime??record.engraveMinutes)),
    actualTotalTime:actualTotal==null||actualTotal===""||num(actualTotal)<=0?null:num(actualTotal),
    actualMinutes:actualTotal==null||actualTotal===""||num(actualTotal)<=0?null:num(actualTotal),
    estimatedCutTime:num(record.estimatedCutTime??record.cutMinutes),
    actualCutTime:record.actualCutTime==null||record.actualCutTime===""?null:num(record.actualCutTime),
    estimatedEngravingTime:num(record.estimatedEngravingTime??record.engraveMinutes),
    actualEngravingTime:record.actualEngravingTime==null||record.actualEngravingTime===""?null:num(record.actualEngravingTime),
    materialCost:record.materialCost==null?null:num(record.materialCost),
    sale:record.actualPrice==null?0:num(record.actualPrice),
    cost:num(record.cost),
    profit:record.actualPrice==null?null:num(record.actualPrice)-num(record.cost)
  };
}
export function isRealProject(record){return record?.recordType!=="reference";}
export function isReferenceRecord(record){return record?.recordType==="reference";}
export function getRealProjects(){return state.projects.filter(isRealProject);}
export function getReferenceProjects(){return state.projects.filter(isReferenceRecord);}
export function mergeSettings(settings={}){
  return {
    ...defaults.settings,
    ...(settings||{}),
    design:{...defaults.settings.design,...(settings?.design||{})},
    customerObject:{
      ...defaults.settings.customerObject,
      ...(settings?.customerObject||{}),
      difficulties:{...defaults.settings.customerObject.difficulties,...(settings?.customerObject?.difficulties||{})},
      risks:{...defaults.settings.customerObject.risks,...(settings?.customerObject?.risks||{})}
    }
  };
}
function migrateEmbeddedReferences(container){
  container.learningRecords=Array.isArray(container.learningRecords)?container.learningRecords:[];
  container.projects.filter(isReferenceRecord).forEach(project=>{
    if(!project.estimatorData||container.learningRecords.some(r=>r.projectId===project.id))return;
    container.learningRecords.unshift(normalizeLearningRecord({
      ...project.estimatorData,
      id:uid(),
      projectId:project.id,
      title:project.title,
      estimatedPrice:project.estimatedPrice??project.sale,
      actualPrice:project.actualPrice??null,
      created:project.created,
      reference:true
    }));
  });
}
export function save(){
  localStorage.setItem(KEY,JSON.stringify(state));
  document.dispatchEvent(new CustomEvent('dla:state-saved'));
  scheduleCloudSave();
}
export function setSyncStatus(text, kind=""){
  const el=$("syncStatus");
  if(!el)return;
  el.textContent=text;
  el.className="sync-status "+kind;
}
function scheduleCloudSave(){
  if(!cloudReady || !currentUser)return;
  clearTimeout(saveTimer);
  setSyncStatus("Speichert …","busy");
  saveTimer=setTimeout(saveCloudState,500);
}
async function saveCloudState(){
  if(!currentUser)return;
  const client=await createSupabaseClient();
  const { error } = await client.from("app_state").upsert({
    user_id: currentUser.id,
    data: state,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" });
  if(error){
    console.error(error);
    setSyncStatus("Fehler","error");
  }else{
    setSyncStatus("Gespeichert","ok");
  }
}
export async function loadCloudState(){
  const client=await createSupabaseClient();
  setSyncStatus("Synchronisiert …","busy");
  const { data, error } = await client.from("app_state").select("data").eq("user_id",currentUser.id).maybeSingle();
  if(error){
    console.error(error);
    setSyncStatus("DB-Fehler","error");
    return false;
  }
  if(data?.data){
    replaceState({...defaults,...data.data,settings:mergeSettings(data.data.settings)});
    state.templates=Array.isArray(state.templates)?state.templates:[];
    state.projects=(state.projects||[]).map(normalizeProjectRecord);
    state.learningRecords=(Array.isArray(state.learningRecords)?state.learningRecords:[]).map(normalizeLearningRecord);
    state.processingProfiles=normalizeProcessingProfiles(state.processingProfiles);
    migrateEmbeddedReferences(state);
    state.timer={...defaults.timer,...(state.timer||{})};
    state.motifEstimator={...defaults.motifEstimator,...(state.motifEstimator||{})};
state.machines=(state.machines||[]).map(m=>{const d=defaults.machines.find(x=>x.id===m.id)||{};return {...d,...m,engraveSpeed:num(m.engraveSpeed)||num(d.engraveSpeed),cutSpeed:num(m.cutSpeed)||num(d.cutSpeed)};});
    state.materials=(state.materials||[]).map(m=>({
      ...m,mainRole:m.mainRole!==false,consumableRole:Boolean(m.consumableRole||m.area==="Sonstiges"),
      consumableCategory:m.consumableCategory||"Sonstiges",defaultConsumption:num(m.defaultConsumption),autoAdd:Boolean(m.autoAdd),favorite:Boolean(m.favorite),
      variants:Array.isArray(m.variants)?m.variants.map(v=>({...v,id:v.id||uid(),name:v.name||"Variante",price:num(v.price),quantity:num(v.quantity)||1,unit:v.unit||m.unit||"Stück",unitPrice:num(v.unitPrice)||(num(v.quantity)>0?num(v.price)/num(v.quantity):0),trackStock:Boolean(v.trackStock),stock:num(v.stock),minStock:num(v.minStock),favorite:Boolean(v.favorite),images:Array.isArray(v.images)?v.images:(v.image?[v.image]:[]),image:v.image||v.images?.[0]||"",note:v.note||"",location:v.location||"",supplier:v.supplier||"",properties:v.properties||"",stockHistory:Array.isArray(v.stockHistory)?v.stockHistory:[]})):[],
      stockHistory:Array.isArray(m.stockHistory)?m.stockHistory:[],trackStock:Boolean(m.trackStock),stock:num(m.stock),minStock:num(m.minStock),
      category:inferMaterialCategory(m),supplier:m.supplier||"",image:m.image||"",lastUsed:m.lastUsed||null,width:num(m.width),height:num(m.height),dimensionUnit:m.dimensionUnit||"cm",sheetCount:num(m.sheetCount)||1,
      consumableModules:Array.isArray(m.consumableModules)&&m.consumableModules.length?m.consumableModules:["3d","laser","vinyl","textil"],
      scaleWithSize:Boolean(m.scaleWithSize),
      workshopUnit:m.workshopUnit||m.unit||"Einheit",
      workshopUnitAmount:num(m.workshopUnitAmount)||1,
      consumptionLevels:{
        small:num(m.consumptionLevels?.small)||(Boolean(m.scaleWithSize)?num(m.defaultConsumption)*(num(m.sizeFactors?.small)||0.5):num(m.defaultConsumption)),
        medium:num(m.consumptionLevels?.medium)||num(m.defaultConsumption),
        large:num(m.consumptionLevels?.large)||(Boolean(m.scaleWithSize)?num(m.defaultConsumption)*(num(m.sizeFactors?.large)||2):num(m.defaultConsumption))
      },
      sizeFactors:{small:num(m.sizeFactors?.small)||0.5,medium:num(m.sizeFactors?.medium)||1,large:num(m.sizeFactors?.large)||2}
    }));
    state.machines=Array.isArray(state.machines)&&state.machines.length?state.machines:structuredClone(defaults.machines);
    localStorage.setItem(KEY,JSON.stringify(state));
  }else{
    await saveCloudState();
  }
  document.dispatchEvent(new CustomEvent('dla:state-loaded'));
  setSyncStatus("Gespeichert","ok");
  return true;
}



export function replaceState(nextState){
  state = nextState;
}

export async function initializeAuth(){
  if(authInitializing)return;
  authInitializing=true;
  const gate=$("authGate");
  const authText=$("authText");
  const authError=$("authError");
  const retryBtn=$("authRetryBtn");
  const showLogin=(message="",headline="Melde dich an, damit deine Daten sicher in Supabase gespeichert werden.")=>{
    gate.classList.remove("auth-pending","hidden");
    authText.textContent=headline;
    authError.textContent=message;
    retryBtn?.classList.toggle("hidden",!message);
    $("logoutBtn").classList.add("hidden");
  };
  try{
    gate.classList.remove("hidden");
    gate.classList.add("auth-pending");
    authText.textContent="Anmeldung wird geprüft …";
    authError.textContent="";
    retryBtn?.classList.add("hidden");
    const client=await createSupabaseClient();
    const { data:{ session }={}, error } = await withTimeout(
      client.auth.getSession(),
      10000,
      "Zeitüberschreitung bei der Sessionprüfung."
    );
    if(error) throw error;
    if(session?.user) await enterApp(session.user);
    else showLogin();

    if(!authListenerRegistered){
      authListenerRegistered=true;
      client.auth.onAuthStateChange((event, session)=>{
      if((event==="INITIAL_SESSION"||event==="SIGNED_IN"||event==="TOKEN_REFRESHED")&&session?.user){
        if(session.user.id!==currentUser?.id) void enterApp(session.user);
        return;
      }
      if(event==="SIGNED_OUT"&&logoutRequested){
        logoutRequested=false;
        currentUser=null;cloudReady=false;
        showLogin();
        setSyncStatus("Offline","");
      }
      });
    }
  }catch(error){
    console.error("Auth-Initialisierung fehlgeschlagen:",error);
    showLogin(
      "Bitte Internetverbindung prüfen und erneut versuchen.",
      "Die Anmeldung konnte nicht geprüft werden."
    );
  }finally{
    gate.classList.remove("auth-pending");
    authInitializing=false;
  }
}
async function enterApp(user){
  if(enteringApp)return;
  enteringApp=true;
  currentUser=user;
  $("authGate").classList.remove("auth-pending");
  $("authGate").classList.add("hidden");
  $("logoutBtn").classList.remove("hidden");
  cloudReady=false;
  try{
    cloudReady=await loadCloudState();
  }catch(error){
    console.error("Cloud-Daten konnten nicht geladen werden:",error);
    cloudReady=false;
    setSyncStatus("Offline – lokale Daten verfügbar","error");
  }finally{
    enteringApp=false;
  }
}
$("loginForm").onsubmit=async e=>{
  e.preventDefault();
  $("authError").textContent="";
  const email=$("loginEmail").value.trim();
  const password=$("loginPassword").value;
  const btn=e.submitter||$("loginForm").querySelector('button[type="submit"]');
  try{
    if(btn){btn.disabled=true;btn.textContent="Anmeldung …";}
    const client=await createSupabaseClient();
    const { data, error }=await client.auth.signInWithPassword({email,password});
    if(error) throw error;
    if(data?.user) await enterApp(data.user);
  }catch(error){
    console.error("Login fehlgeschlagen:",error);
    $("authError").textContent="Anmeldung fehlgeschlagen. Prüfe E-Mail, Passwort und Internetverbindung.";
  }finally{
    if(btn){btn.disabled=false;btn.textContent="Anmelden";}
  }
};
$("logoutBtn").onclick=async()=>{
  if(await appConfirm("Wirklich abmelden?","Abmelden","Abmelden")){
    logoutRequested=true;
    const client=await createSupabaseClient();
    const { error }=await client.auth.signOut();
    if(error){
      logoutRequested=false;
      console.error("Abmelden fehlgeschlagen:",error);
      setSyncStatus("Abmelden fehlgeschlagen","error");
    }
  }
};
window.__dlaRetryAuth=()=>initializeAuth();
