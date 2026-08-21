const MONITORING_SCHEMA_VERSION = 1;
const MAX_NOTE_LENGTH = 1000;

const numberOrNull=value=>{
  if(value===null||value===undefined||value==="")return null;
  const parsed=Number(value);
  return Number.isFinite(parsed)?parsed:null;
};

function redactFreeText(value){
  return String(value||"")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[E-Mail entfernt]")
    .replace(/(?:\+49|0049|0)[\s()\/-]*(?:\d[\s()\/-]*){6,}/g,"[Telefon entfernt]")
    .replace(/\b\d{5}\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß.-]+(?:\s+[A-ZÄÖÜ][A-Za-zÄÖÜäöüß.-]+)*\b/g,"[Ort entfernt]")
    .replace(/\b[A-ZÄÖÜ][A-Za-zÄÖÜäöüß.-]+(?:straße|str\.|weg|gasse|allee|platz)\s+\d+[a-z]?\b/gi,"[Anschrift entfernt]")
    .trim()
    .slice(0,MAX_NOTE_LENGTH);
}

function customerName(project,customers){
  const id=String(project?.customerId||"");
  const customer=id?customers.find(entry=>String(entry?.id||"")===id):null;
  return String(customer?.companyName||project?.customer||"").trim().slice(0,160);
}

const finalPrice=project=>numberOrNull(project?.agreementPrice??project?.actualPrice??project?.sale);
const recommendedPrice=project=>numberOrNull(project?.pricingBreakdown?.recommendedPrice??project?.calculationSnapshot?.sale??project?.estimatedPrice??project?.sale);
const selfCosts=project=>numberOrNull(project?.pricingBreakdown?.selfCosts??project?.pricingBreakdown?.cost??project?.calculationSnapshot?.cost??project?.cost);
const deadline=project=>project?.dueDate||project?.deadline||project?.deliveryDate||project?.targetDate||null;

function projectWarnings(project,cost,price,recommended){
  const warnings=[];
  if(cost!==null&&price!==null&&price<cost)warnings.push("Preis unter Selbstkosten");
  if(recommended!==null&&price!==null&&price<recommended)warnings.push("Preis unter Empfehlung");
  if(numberOrNull(project?.riskSurcharge)===0&&project?.orderType==="customerObject")warnings.push("Kundenobjekt ohne Risikoaufschlag");
  if(!project?.customerId&&!project?.customer)warnings.push("Kein Kunde zugeordnet");
  return warnings;
}

export function buildMonitoringSnapshot(sourceState={},userId=""){
  const customers=Array.isArray(sourceState.customers)?sourceState.customers:[];
  const projects=(Array.isArray(sourceState.projects)?sourceState.projects:[])
    .filter(project=>project&&project.recordType!=="reference"&&project.isReference!==true&&project.reference!==true)
    .map(project=>{
      const price=finalPrice(project),recommended=recommendedPrice(project),cost=selfCosts(project);
      return {
        id:String(project.id||""),title:String(project.title||"Unbenanntes Projekt").trim().slice(0,200),
        customer:customerName(project,customers),status:String(project.status||"offer"),
        orderType:String(project.orderType||project.projectType||""),createdAt:project.created||null,
        updatedAt:project.updated||project.created||null,deadline:deadline(project),recommendedPrice:recommended,
        agreedPrice:price,selfCosts:cost,profit:price!==null&&cost!==null?price-cost:null,
        riskSurcharge:numberOrNull(project.riskSurcharge),difficulty:String(project.difficulty||""),
        notes:redactFreeText(project.notes||project.agreementPriceNote||""),
        warnings:projectWarnings(project,cost,price,recommended)
      };
    });
  return {schemaVersion:MONITORING_SCHEMA_VERSION,ownerId:String(userId||""),generatedAt:new Date().toISOString(),projects};
}

export function monitoringSnapshotHasPrivateFields(snapshot){
  const forbidden=new Set(["street","postalCode","city","phone","email","contactPerson","images","image"]);
  const visit=value=>{
    if(!value||typeof value!=="object")return false;
    return Object.entries(value).some(([key,child])=>forbidden.has(key)||visit(child));
  };
  return visit(snapshot);
}
