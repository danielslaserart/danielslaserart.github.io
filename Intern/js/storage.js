import { $, num, uid, inferMaterialCategory } from "./utils.js?v=6.6.16";
import { appConfirm } from "./dialogs.js?v=6.6.16";
import { buildMonitoringSnapshot, monitoringSnapshotHasPrivateFields } from "./monitoring.js?v=6.6.16";
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
let securityState = "checking-session";
let cloudRecordLoaded = false;
let confirmedInitialTransfer = false;
let cloudUpdatedAt = null;
let legacyLocalState = null;
let loadedCloudState = null;

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
const APP_VERSION = "6.6";
const VERSION_KEY = "dla_app_version";
const MIGRATION_ACK_KEY = "dla_migration_completed_v1";
const PREVIOUS_APP_VERSION = localStorage.getItem(VERSION_KEY);
if (PREVIOUS_APP_VERSION !== APP_VERSION) {
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
    profit:0,hourly:0,machine3d:0,laserGravur:0,laserSchnitt:0,
    plotter:0,presse:0,reserve:0,packaging:0,rounding:0,
    overhead:0,electricity:0,defaultMachine:"",defaultMaterial:"",
    design:{hourlyRate:0,minimumFee:0},
    customerObject:{
      baseFee:0,minimumPrice:0,expressFee:0,
      difficulties:{veryEasy:0,easy:0,normal:0,hard:0,veryHard:0},
      risks:{under50:0,from50To100:0,from100To250:0,from250To500:0,over500:0}
    }
  },
  materials:[],processingProfiles:[],projects:[],customers:[],templates:[],learningRecords:[],motifEstimator:{calibrationFactor:1,samples:0,lastDetected:"high"},activeModule:"3d",lastPrice:null,timer:{running:false,startedAt:null,elapsed:0},
  machines:[]
};
export function normalizeCustomerRecord(customer={}){
  if(!customer||typeof customer!=="object")return null;
  const rawRating=customer.rating;
  const parsedRating=rawRating===""||rawRating===null||rawRating===undefined?0:Number(rawRating);
  const rating=Number.isFinite(parsedRating)?Math.min(5,Math.max(0,Math.round(parsedRating))):0;
  return {...customer,rating};
}
function customerPayload(customer={}){
  const normalized=normalizeCustomerRecord(customer)||{...customer,rating:0};
  return {...normalized,rating:Number(normalized.rating??0)};
}
function normalizeCustomers(customers){
  return (Array.isArray(customers)?customers:[]).map(customerPayload).filter(Boolean);
}

export let state = structuredClone(defaults);

export function load(){
  return structuredClone(defaults);
}
function normalizeLoadedState(saved){
  try{
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
    merged.machines=Array.isArray(merged.machines)?merged.machines:[];
    merged.processingProfiles=normalizeProcessingProfiles(merged.processingProfiles);
    merged.projects=(merged.projects||[]).map(normalizeProjectRecord);
    merged.customers=normalizeCustomers(merged.customers);
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
export function normalizeOrderType(value,project={}){
  const normalized=String(value??"").trim().toLowerCase().replace(/[\s_-]/g,"");
  if(["own","ownproduct","eigenesprodukt"].includes(normalized))return "own";
  if(["customer","customerobject","kundenobjekt"].includes(normalized))return "customerObject";
  if(["service","dienstleistung"].includes(normalized))return "service";
  if(["design","filedesign","dateidienstleistung"].includes(normalized))return "design";
  const customerHints=project.materialSource==="customer"||project.customerMaterial===true||
    project.baseFee!=null||project.customerObjectProcess||project.objectMaterial||
    project.riskSurcharge!=null||project.expressSurcharge!=null;
  if(project.projectType==="design")return "design";
  return customerHints?"customerObject":"own";
}
export function normalizeProjectRecord(project={}){
  if(!project||typeof project!=="object")return null;
  const clearlyGeneratedReference=project.reference===true&&project.estimatorData&&project.actualPrice==null&&project.agreementPrice==null&&(
    project.notes==="Aus Angebotsassistent erstellt"||
    (project.tags||[]).includes("Schätzer")
  );
  const recordType=project.recordType==="reference"||clearlyGeneratedReference?"reference":"project";
  const estimatedPrice=project.estimatedPrice??(recordType==="reference"?num(project.sale):null);
  const actualPrice=project.actualPrice??(recordType==="project"?num(project.sale):null);
  const inferredCustomerObject=String(project.type||"").toLowerCase().includes("kundenobjekt");
  const orderType=normalizeOrderType(project.orderType,{...project,customerObjectProcess:project.customerObjectProcess||(inferredCustomerObject?"engrave":null)});
  return {
    ...project,
    customerId:project.customerId?String(project.customerId):null,
    title:String(project.title||project.projectName||project.name||"Unbenanntes Projekt"),
    customerName:String(project.customerName||project.customer||""),
    agreementPrice:(project.agreementPrice??project.agreedPrice??project.customerAgreementPrice)===null||(project.agreementPrice??project.agreedPrice??project.customerAgreementPrice)===undefined||(project.agreementPrice??project.agreedPrice??project.customerAgreementPrice)===""?null:num(project.agreementPrice??project.agreedPrice??project.customerAgreementPrice),
    priceAgreementDate:(project.priceAgreementDate??project.agreementPriceDate)&&!Number.isNaN(new Date(project.priceAgreementDate??project.agreementPriceDate).getTime())?project.priceAgreementDate??project.agreementPriceDate:null,
    isPreferredRepeatPrice:(project.agreementPrice??project.agreedPrice??project.customerAgreementPrice)!==null&&(project.agreementPrice??project.agreedPrice??project.customerAgreementPrice)!==undefined&&(project.agreementPrice??project.agreedPrice??project.customerAgreementPrice)!==""&&Boolean(project.isPreferredRepeatPrice??project.isPreferredCustomerPrice),
    priceType:["normal","regularCustomer","special","promotion","repeatOrder","other"].includes(project.priceType??project.agreementPriceType)?project.priceType??project.agreementPriceType:(Boolean(project.isPreferredRepeatPrice??project.isPreferredCustomerPrice)?"regularCustomer":"normal"),
    agreementPriceNote:String(project.agreementPriceNote??project.agreementNote??""),
    agreementPriceCreatedAt:project.agreementPriceCreatedAt&&!Number.isNaN(new Date(project.agreementPriceCreatedAt).getTime())?project.agreementPriceCreatedAt:null,
    calculationSource:project.calculationSource||project.calculationSnapshot?.sourceModule||(project.estimatorData&&!project.fields?"estimator":"calculator"),
    calculationSnapshot:project.calculationSnapshot&&typeof project.calculationSnapshot==="object"?project.calculationSnapshot:null,
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
    status:recordType==="project"?normalizeProjectStatus(project.status||"offer"):null,
    tags:Array.isArray(project.tags)?project.tags:(project.tags?String(project.tags).split(",").map(x=>x.trim()).filter(Boolean):[]),
    images:Array.isArray(project.images)?project.images.filter(Boolean):(project.image?[project.image]:[]),
    priceHistory:Array.isArray(project.priceHistory)?project.priceHistory:[],
    workSeconds:num(project.workSeconds),
    positions:Array.isArray(project.positions)?project.positions.map((position,index)=>({
      ...position,id:String(position.id||uid()),order:Number.isFinite(Number(position.order))?Number(position.order):index,
      quantity:Math.max(0,num(position.quantity)),materialCost:position.materialSource==="customer"?0:Math.max(0,num(position.materialCost)),
      machineMinutes:Math.max(0,num(position.machineMinutes)),machineCost:Math.max(0,num(position.machineCost)),workMinutes:Math.max(0,num(position.workMinutes)),workCost:Math.max(0,num(position.workCost)),otherCost:Math.max(0,num(position.otherCost)),materialConsumption:Math.max(0,num(position.materialConsumption)),printGrams:Math.max(0,num(position.printGrams)),stockDeducted:Boolean(position.stockDeducted),stockDeductedAmount:Math.max(0,num(position.stockDeductedAmount))
    })):undefined
  };
}
export function normalizeLearningRecord(record={}){
  const actualTotal=record.actualTotalTime??record.actualMinutes;
  return {
    ...record,
    recordType:"reference",
    orderType:normalizeOrderType(record.orderType,record),
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
export function getRealProjects(){return state.projects.filter(Boolean).filter(isRealProject);}
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
  if(!canWriteCloud()){
    setSyncStatus("Gesperrt","error");
    return false;
  }
  state.customers=normalizeCustomers(state.customers);
  document.dispatchEvent(new CustomEvent('dla:state-saved'));
  scheduleCloudSave();
  return true;
}
export function setSyncStatus(text, kind=""){
  const el=$("syncStatus");
  if(!el)return;
  el.textContent=text;
  el.className="sync-status "+kind;
}
function scheduleCloudSave(){
  if(!canWriteCloud())return;
  clearTimeout(saveTimer);
  setSyncStatus("Speichert …","busy");
  saveTimer=setTimeout(()=>saveCloudState().catch(()=>{}),500);
}
function isNeutralState(value){
  return !value||(
    !(value.customers?.length)&&!(value.projects?.length)&&!(value.materials?.length)&&
    !(value.machines?.length)&&!(value.processingProfiles?.length)&&!(value.templates?.length)&&
    !(value.learningRecords?.length)&&Object.values(value.settings||{}).every(item=>
      item&&typeof item==="object"?Object.values(item).every(nested=>nested&&typeof nested==="object"?Object.values(nested).every(v=>!v):!nested):!item
    )
  );
}
function canWriteCloud(){
  return Boolean(currentUser&&cloudReady&&cloudRecordLoaded&&securityState==="ready"&&!isNeutralState(state));
}
async function saveCloudState(payloadOverride=null,{confirmedMigration=false}={}){
  const payloadSource=payloadOverride||state;
  const migrationAllowed=confirmedMigration&&confirmedInitialTransfer&&currentUser&&securityState==="migrating";
  if(!canWriteCloud()&&!migrationAllowed)throw new Error("Cloud-Speicherung ist aus Sicherheitsgründen gesperrt.");
  if(isNeutralState(payloadSource))throw new Error("Ein neutraler oder leerer Zustand darf nicht gespeichert werden.");
  payloadSource.customers=normalizeCustomers(payloadSource.customers);
  const payload={
    ...payloadSource,
    customers:payloadSource.customers.map(customer=>({...customer,rating:Number(customer.rating??0)}))
  };
  const client=await createSupabaseClient();
  const { data, error } = await client.from("app_state").upsert({
    user_id: currentUser.id,
    data: payload,
    updated_at: new Date().toISOString()
  }, { onConflict: "user_id" }).select().single();
  if(error){
    console.error("Kunde konnte nicht gespeichert werden:",error);
    setSyncStatus("Fehler","error");
    throw error;
  }else{
    await saveMonitoringSnapshot(client,payload).catch(monitoringError=>{
      console.warn("Datensparsame Auftragsprüfung konnte nicht aktualisiert werden:",monitoringError);
    });
    setSyncStatus("Gespeichert","ok");
    return data;
  }
}

async function saveMonitoringSnapshot(client,payload){
  const snapshot=buildMonitoringSnapshot(payload,currentUser?.id);
  if(monitoringSnapshotHasPrivateFields(snapshot))throw new Error("Der Prüfdatensatz enthält gesperrte Kundendaten.");
  const {error}=await client.from("order_monitor_state").upsert({
    user_id:currentUser.id,data:snapshot,updated_at:new Date().toISOString()
  },{onConflict:"user_id"});
  if(error)throw error;
}
export async function flushCloudSave(){
  if(!canWriteCloud())return null;
  clearTimeout(saveTimer);
  saveTimer=null;
  setSyncStatus("Speichert …","busy");
  return saveCloudState();
}
export async function loadCloudState(){
  const client=await createSupabaseClient();
  setSyncStatus("Synchronisiert …","busy");
  const { data, error } = await client.from("app_state").select("data,updated_at").eq("user_id",currentUser.id).maybeSingle();
  if(error){
    throw error;
  }
  if(data?.data){
    loadedCloudState=structuredClone(data.data);
    cloudUpdatedAt=data.updated_at||null;
    return {exists:true,data:loadedCloudState,updatedAt:cloudUpdatedAt};
  }
  loadedCloudState=null;
  cloudUpdatedAt=null;
  return {exists:false,data:null,updatedAt:null};
}



export function replaceState(nextState){
  state = nextState;
}

const COMPARE_AREAS=[
  ["settings","Einstellungen"],["customers","Kunden"],["projects","Projekte"],
  ["materials","Materialien inkl. Varianten"],["machines","Maschinen"],
  ["processingProfiles","Bearbeitungsprofile"],["templates","Vorlagen"],
  ["learningRecords","Lern- und Referenzdaten"],["motifEstimator","Motivschätzer"],
  ["other","Sonstige Geschäftsdaten"]
];
const COMPARED_KEYS=new Set(COMPARE_AREAS.filter(([key])=>key!=="other").map(([key])=>key));
// Flüchtige Laufzeitwerte werden absichtlich ignoriert: timer, lastPrice, activeModule.
const VOLATILE_KEYS=new Set(["timer","lastPrice","activeModule"]);
function readLegacyState(){
  try{
    const raw=localStorage.getItem(KEY);
    const parsed=raw?JSON.parse(raw):null;
    return parsed&&typeof parsed==="object"?parsed:null;
  }catch{return null;}
}
function migrationWasCompleted(){
  try{return JSON.parse(localStorage.getItem(MIGRATION_ACK_KEY)||"null")?.userId===currentUser?.id;}catch{return false;}
}
function rememberCompletedMigration(){
  if(!currentUser)return;
  localStorage.setItem(MIGRATION_ACK_KEY,JSON.stringify({userId:currentUser.id,completedAt:new Date().toISOString()}));
}
function stableValue(value){
  if(Array.isArray(value))return value.map(stableValue);
  if(value&&typeof value==="object")return Object.keys(value).sort().reduce((result,key)=>{
    if(!VOLATILE_KEYS.has(key))result[key]=stableValue(value[key]);
    return result;
  },{});
  return value;
}
function areaValue(source,key){
  if(key!=="other")return stableValue(source?.[key]??(Array.isArray(defaults[key])?[]:{}));
  return stableValue(Object.keys(source||{}).sort().reduce((result,name)=>{
    if(!COMPARED_KEYS.has(name)&&!VOLATILE_KEYS.has(name))result[name]=source[name];
    return result;
  },{}));
}
function countArea(value,key){
  if(key==="materials")return (Array.isArray(value)?value.length:0)+(Array.isArray(value)?value.reduce((sum,item)=>sum+(item.variants?.length||0),0):0);
  if(Array.isArray(value))return value.length;
  return value&&typeof value==="object"?Object.keys(value).length:0;
}
async function checksum(value){
  const bytes=new TextEncoder().encode(JSON.stringify(stableValue(value)));
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest)).map(byte=>byte.toString(16).padStart(2,"0")).join("").slice(0,12);
}
async function compareStates(localData,cloudData){
  const rows=[];
  for(const [key,label] of COMPARE_AREAS){
    const localValue=areaValue(localData,key);
    const cloudValue=areaValue(cloudData,key);
    const [localHash,cloudHash]=await Promise.all([checksum(localValue),checksum(cloudValue)]);
    rows.push({key,label,localCount:countArea(localValue,key),cloudCount:countArea(cloudValue,key),localHash,cloudHash,equal:localHash===cloudHash});
  }
  return rows;
}
function backupFilename(source){
  const now=new Date();
  const stamp=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}-${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;
  return `DLA-Kalkulator-${source}-${stamp}.json`;
}
function downloadBackup(source,data){
  if(!data)return;
  const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;link.download=backupFilename(source);link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function resetActiveState(){
  clearTimeout(saveTimer);saveTimer=null;
  replaceState(structuredClone(defaults));
  document.dispatchEvent(new CustomEvent("dla:security-reset"));
}
function showSecurityView({headline,text,error="",mode="login",rows=[]}={}){
  const gate=$("authGate");
  gate.classList.remove("hidden","auth-pending");
  $("authHeadline").textContent=headline||"Interner Kalkulator";
  $("authText").textContent=text||"";
  $("authError").textContent=error;
  $("loginForm").classList.toggle("hidden",mode!=="login");
  $("authRetryBtn").classList.toggle("hidden",mode!=="error");
  $("securityActions").classList.toggle("hidden",!["compare","missing"].includes(mode));
  $("comparisonWrap").classList.toggle("hidden",mode!=="compare");
  $("useCloudBtn").classList.toggle("hidden",mode!=="compare");
  $("uploadLocalBtn").classList.toggle("hidden",!legacyLocalState||!["compare","missing"].includes(mode));
  $("downloadCloudBtn").classList.toggle("hidden",!loadedCloudState);
  $("downloadLocalBtn").classList.toggle("hidden",!legacyLocalState);
  $("cancelMigrationBtn").classList.toggle("hidden",!["compare","missing"].includes(mode));
  $("securityLogoutBtn").classList.toggle("hidden",!currentUser);
  if(mode==="compare")renderComparison(rows);
  $("logoutBtn").classList.toggle("hidden",!currentUser);
}
function renderComparison(rows){
  const body=$("comparisonBody");
  body.innerHTML=rows.map(row=>`<tr><td>${row.label}</td><td>${row.localCount}<small>${row.localHash}</small></td><td>${row.cloudCount}<small>${row.cloudHash}</small></td><td class="${row.equal?"comparison-ok":"comparison-diff"}">${row.equal?"gleich":"abweichend"}</td></tr>`).join("");
  $("cloudUpdatedAt").textContent=cloudUpdatedAt?new Date(cloudUpdatedAt).toLocaleString("de-DE"):"nicht verfügbar";
}
function openReady(cloudData){
  replaceState(normalizeLoadedState(structuredClone(cloudData)));
  cloudRecordLoaded=true;cloudReady=true;securityState="ready";
  $("authGate").classList.add("hidden");
  setSyncStatus("Gespeichert","ok");
  document.dispatchEvent(new CustomEvent("dla:state-loaded"));
}
async function evaluateLoadedCloud(result){
  legacyLocalState=readLegacyState();
  if(!result.exists){
    securityState="missing-cloud-record";
    showSecurityView({mode:"missing",headline:"Noch kein Supabase-Datenstand",text:legacyLocalState?"Ein lokaler Altbestand wurde gefunden. Sichere ihn zuerst und übertrage ihn nur nach sorgfältiger Prüfung.":"Es gibt weder einen Cloud-Datensatz noch einen lokalen Altbestand. Die App bleibt geschlossen, bis die Ersteinrichtung bewusst vorgenommen wird."});
    return;
  }
  if(!legacyLocalState){openReady(result.data);return;}
  if(migrationWasCompleted()||PREVIOUS_APP_VERSION==="6.4.4"){
    rememberCompletedMigration();
    openReady(result.data);
    return;
  }
  const rows=await compareStates(legacyLocalState,result.data);
  if(rows.every(row=>row.equal)){openReady(result.data);return;}
  securityState="migration-required";
  showSecurityView({mode:"compare",rows,headline:"Datenbestände weichen ab",text:"Bitte lade zuerst beide Sicherungen herunter. Danach entscheidest du bewusst, welcher Datenstand verwendet werden soll."});
}

export async function initializeAuth(){
  if(authInitializing)return;
  authInitializing=true;
  const gate=$("authGate");
  const authText=$("authText");
  const authError=$("authError");
  const retryBtn=$("authRetryBtn");
  const showLogin=(message="",headline="Melde dich an, damit deine Daten sicher aus Supabase geladen werden.")=>showSecurityView({mode:message?"error":"login",headline:"Interner Kalkulator",text:headline,error:message});
  try{
    gate.classList.remove("hidden");
    gate.classList.add("auth-pending");
    securityState="checking-session";
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
        currentUser=null;cloudReady=false;cloudRecordLoaded=false;confirmedInitialTransfer=false;loadedCloudState=null;securityState="signed-out";
        resetActiveState();
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
  securityState="loading-cloud";
  showSecurityView({mode:"loading",headline:"Supabase-Daten werden geladen",text:"Die Anwendung bleibt bis zum erfolgreichen Laden sicher geschlossen."});
  $("logoutBtn").classList.remove("hidden");
  cloudReady=false;cloudRecordLoaded=false;
  try{
    const result=await loadCloudState();
    await evaluateLoadedCloud(result);
  }catch(error){
    console.error("Cloud-Daten konnten nicht geladen werden:",error);
    cloudReady=false;cloudRecordLoaded=false;securityState="cloud-error";
    resetActiveState();
    setSyncStatus("Cloud-Fehler","error");
    showSecurityView({mode:"error",headline:"Supabase-Daten konnten nicht geladen werden",text:"Es wurden keine lokalen Ersatzdaten aktiviert.",error:"Bitte Internetverbindung prüfen und erneut versuchen oder abmelden."});
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
    await performLogout();
  }
};
async function performLogout(){
  clearTimeout(saveTimer);saveTimer=null;cloudReady=false;cloudRecordLoaded=false;securityState="signing-out";resetActiveState();
  logoutRequested=true;
  const client=await createSupabaseClient();
  const {error}=await client.auth.signOut();
  if(error){logoutRequested=false;showSecurityView({mode:"error",headline:"Abmelden fehlgeschlagen",text:"Die Anwendung bleibt sicher geschlossen.",error:"Bitte erneut versuchen."});}
}
$("securityLogoutBtn").onclick=performLogout;
$("downloadLocalBtn").onclick=()=>downloadBackup("lokal",legacyLocalState);
$("downloadCloudBtn").onclick=()=>downloadBackup("supabase",loadedCloudState);
$("cancelMigrationBtn").onclick=()=>showSecurityView({mode:"loading",headline:"Migration abgebrochen",text:"Es wurden keine Daten verändert. Du kannst die Seite neu laden oder dich abmelden."});
$("useCloudBtn").onclick=()=>{rememberCompletedMigration();openReady(loadedCloudState);};
$("uploadLocalBtn").onclick=async()=>{
  if(!legacyLocalState||isNeutralState(legacyLocalState))return showSecurityView({mode:"missing",headline:"Übertragung gesperrt",text:"Der lokale Datenstand ist leer oder offensichtlich unvollständig."});
  const confirmed=await appConfirm("Der vorhandene Supabase-Datensatz wird vollständig durch den lokalen Altbestand ersetzt. Hast du beide verfügbaren Sicherungen heruntergeladen und möchtest du wirklich fortfahren?","Lokale Daten übertragen","Ja, ersetzen");
  if(!confirmed)return;
  securityState="migrating";confirmedInitialTransfer=true;cloudReady=false;
  showSecurityView({mode:"loading",headline:"Migration läuft",text:"Daten werden übertragen und anschließend vollständig erneut geprüft."});
  try{
    await saveCloudState(structuredClone(legacyLocalState),{confirmedMigration:true});
    const verified=await loadCloudState();
    if(!verified.exists)throw new Error("Der Datensatz konnte nach der Übertragung nicht erneut gelesen werden.");
    const rows=await compareStates(legacyLocalState,verified.data);
    if(!rows.every(row=>row.equal))throw new Error("Prüfsummen oder Anzahlen stimmen nach der Übertragung nicht überein.");
    loadedCloudState=verified.data;cloudUpdatedAt=verified.updatedAt;confirmedInitialTransfer=false;
    rememberCompletedMigration();
    openReady(verified.data);
  }catch(error){
    console.error("Migration fehlgeschlagen:",error);confirmedInitialTransfer=false;cloudReady=false;cloudRecordLoaded=false;securityState="migration-error";resetActiveState();
    showSecurityView({mode:"error",headline:"Migration nicht freigegeben",text:"Die App bleibt geschlossen; der lokale Altbestand wurde nicht gelöscht.",error:error.message||"Die Überprüfung ist fehlgeschlagen."});
  }
};
window.__dlaRetryAuth=()=>{authInitializing=false;enteringApp=false;initializeAuth();};
