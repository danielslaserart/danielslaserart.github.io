import { num, uid } from "./utils.js";
import { state, save } from "./storage.js";

const detailRank={simple:1,medium:2,high:3,veryHigh:4};

export function estimatorSnapshot(values={}){
  const cost=num(values.cost),sale=num(values.sale);
  return {
    id:values.id||uid(),
    projectId:values.projectId||"",
    created:values.created||new Date().toISOString(),
    updated:new Date().toISOString(),
    materialId:values.materialId||"",
    materialName:values.materialName||"",
    machineId:values.machineId||"",
    machineName:values.machineName||"",
    width:num(values.width),height:num(values.height),
    area:num(values.area)||num(values.width)*num(values.height),
    layers:Math.max(1,num(values.layers)||1),
    detail:values.detail||"high",
    process:values.process||"cut",
    cutMinutes:num(values.cutMinutes),
    engraveMinutes:num(values.engraveMinutes),
    actualMinutes:num(values.actualMinutes),
    sale,cost,profit:sale-cost,
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

export function findSimilarProjects({materialId,machineId,area,detail,process},limit=12){
  const targetArea=Math.max(1,num(area));
  return (state.learningRecords||[])
    .filter(r=>r.reference!==false)
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
  const usable=(similar||[]).filter(r=>num(r.actualMinutes)>0&&num(r.cutMinutes)+num(r.engraveMinutes)>0);
  if(!usable.length||predictedMinutes<=0)return 1;
  const ratios=usable.map(r=>num(r.actualMinutes)/(num(r.cutMinutes)+num(r.engraveMinutes))).sort((a,b)=>a-b);
  const median=ratios[Math.floor(ratios.length/2)]||1;
  return Math.max(.55,Math.min(1.8,median));
}

export function syncReferenceProjects(){
  state.projects.forEach(project=>{
    if(!project.reference||!project.estimatorData)return;
    const existing=(state.learningRecords||[]).find(r=>r.projectId===project.id);
    saveLearningRecord({...project.estimatorData,id:existing?.id,projectId:project.id,reference:true});
  });
}
