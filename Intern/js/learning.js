import { num, uid } from "./utils.js?v=6.4.6";
import { state, save, getRealProjects } from "./storage.js?v=6.4.6";

const detailRank={simple:1,medium:2,high:3,veryHigh:4};

export function estimatorSnapshot(values={}){
  const cost=num(values.cost);
  const estimatedPrice=num(values.estimatedPrice??values.sale);
  const actualPrice=values.actualPrice==null||values.actualPrice===""?null:num(values.actualPrice);
  return {
    id:values.id||uid(),
    projectId:values.projectId||"",
    created:values.created||new Date().toISOString(),
    updated:new Date().toISOString(),
    orderType:["own","customerObject","service"].includes(values.orderType)?values.orderType:"own",
    materialId:values.materialId||"",
    materialName:values.materialName||"",
    machineId:values.machineId||"",
    machineName:values.machineName||"",
    width:num(values.width),height:num(values.height),
    area:num(values.area)||num(values.width)*num(values.height),
    layers:Math.max(1,num(values.layers)||1),
    detail:values.detail||"high",
    process:values.process||"cut",
    estimatedCutTime:num(values.estimatedCutTime??values.cutMinutes),
    actualCutTime:values.actualCutTime==null?null:num(values.actualCutTime),
    estimatedEngravingTime:num(values.estimatedEngravingTime??values.engraveMinutes),
    actualEngravingTime:values.actualEngravingTime==null?null:num(values.actualEngravingTime),
    cutMinutes:num(values.estimatedCutTime??values.cutMinutes),
    engraveMinutes:num(values.estimatedEngravingTime??values.engraveMinutes),
    estimatedTotalTime:num(values.estimatedTotalTime)||(num(values.estimatedCutTime??values.cutMinutes)+num(values.estimatedEngravingTime??values.engraveMinutes)),
    actualTotalTime:values.actualTotalTime==null||values.actualTotalTime===""?null:num(values.actualTotalTime),
    actualMinutes:values.actualTotalTime==null&&values.actualMinutes==null?null:num(values.actualTotalTime??values.actualMinutes),
    estimatedPrice,actualPrice,
    materialCost:values.materialCost==null?null:num(values.materialCost),
    notes:values.notes||"",image:values.image||"",
    sale:actualPrice??0,cost,profit:actualPrice==null?null:actualPrice-cost,
    recordType:"reference",isReference:true,
    reference:values.reference!==false
  };
}

export function saveLearningRecord(values){
  state.learningRecords=Array.isArray(state.learningRecords)?state.learningRecords:[];
  const record=estimatorSnapshot(values);
  const index=state.learningRecords.findIndex(x=>x.id===record.id);
  if(index>=0)state.learningRecords[index]=record;else state.learningRecords.unshift(record);
  save();
  return record;
}

export function deleteLearningRecord(id){
  state.learningRecords=(state.learningRecords||[]).filter(x=>x.id!==id);
  save();
}

export function findSimilarProjects({materialId,machineId,area,detail,process,orderType="own"},limit=12){
  const targetArea=Math.max(1,num(area));
  return (state.learningRecords||[])
    .filter(r=>r.reference!==false&&(r.orderType||"own")===orderType)
    .map(record=>{
      const areaRatio=Math.min(targetArea,Math.max(1,num(record.area)))/Math.max(targetArea,Math.max(1,num(record.area)));
      const material=record.materialId===materialId?1:.35;
      const machine=record.machineId===machineId?1:.55;
      const detailScore=1-Math.min(3,Math.abs((detailRank[record.detail]||3)-(detailRank[detail]||3)))/4;
      const processScore=record.process===process?1:.55;
      const score=areaRatio*.38+material*.22+machine*.18+detailScore*.12+processScore*.10;
      return {record,score};
    })
    .filter(x=>x.score>=.62)
    .sort((a,b)=>b.score-a.score)
    .slice(0,limit)
    .map(x=>x.record);
}

export function learnedTimeFactor(similar,predictedMinutes){
  const actualTotal=r=>num(r.actualMinutes)||(num(r.actualCutTime)+num(r.actualEngravingTime));
  const usable=(similar||[]).filter(r=>actualTotal(r)>0&&num(r.estimatedCutTime??r.cutMinutes)+num(r.estimatedEngravingTime??r.engraveMinutes)>0);
  if(!usable.length||predictedMinutes<=0)return 1;
  const ratios=usable.map(r=>actualTotal(r)/(num(r.estimatedCutTime??r.cutMinutes)+num(r.estimatedEngravingTime??r.engraveMinutes))).sort((a,b)=>a-b);
  const median=ratios[Math.floor(ratios.length/2)]||1;
  return Math.max(.55,Math.min(1.8,median));
}
export function learnedPriceSuggestion(similar,targetArea,fallbackPrice){
  const usable=(similar||[]).filter(r=>r.actualPrice!=null&&num(r.actualPrice)>0&&num(r.area)>0);
  if(!usable.length)return num(fallbackPrice);
  const prices=usable.map(r=>num(r.actualPrice)/num(r.area)*Math.max(1,num(targetArea))).sort((a,b)=>a-b);
  const median=prices[Math.floor(prices.length/2)]||num(fallbackPrice);
  return num(fallbackPrice)*.6+median*.4;
}

export function syncReferenceProjects(){
  getRealProjects().forEach(project=>{
    if(!project.estimatorData||project.actualPrice==null)return;
    const existing=(state.learningRecords||[]).find(r=>r.projectId===project.id);
    saveLearningRecord({...project.estimatorData,id:existing?.id,projectId:project.id,title:project.title,orderType:project.orderType||"own",estimatedPrice:project.estimatedPrice,actualPrice:project.actualPrice,reference:true});
  });
}
