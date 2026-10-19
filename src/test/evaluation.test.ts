import { describe,it,expect } from 'vitest';
import { computeScore,appreciationFor,canEditEvaluation,objectionValid,canSignalDisagreement,objectiveStatus,validateObjectives,validatePdfSelection,currentExercice,exerciceLabel,csvCell } from '@/lib/evaluation';
const sub=(id:string,score:number|null)=>({id,label:id,score,comment:null});
describe('Évaluation V2.1',()=>{
 it('calculates category mean divided by 5 times weight, on a 100 point scale',()=>{const r=computeScore([{id:'a',code:'A',label:'A',weight:0.3,subcriteria:[sub('1',3),sub('2',4)]},{id:'b',code:'B',label:'B',weight:0.7,subcriteria:[sub('3',5)]}]);expect(r.rows[0].note).toBe(3.5);expect(r.rows[0].contribution).toBe(21);expect(r.weightedScore).toBe(91);expect(r.isComplete).toBe(true);});
 it('blocks transmission until every returned criterion is scored',()=>{const r=computeScore([{id:'a',code:'A',label:'A',weight:1,subcriteria:[sub('1',5),sub('2',null)]}]);expect(r.isComplete).toBe(false);expect(r.scored).toBe(1);expect(r.required).toBe(2);expect(r.progress).toBe(50);expect(computeScore([]).isComplete).toBe(false);});
 it('uses the supplied firm appreciation thresholds',()=>{expect(appreciationFor(72,[{label:'Bien',min:60,max:79.99}])?.label).toBe('Bien');expect(appreciationFor(72,[{label:'Excellent',min:70,max:100}])?.label).toBe('Excellent');expect(appreciationFor(null,[])).toBeNull();});
 it('requires 10 characters for an objection',()=>{expect(objectionValid('123456789')).toBe(false);expect(objectionValid('1234567890')).toBe(true);expect(objectionValid(' 123456789 ')).toBe(false);});
 it('offers disagreement only after 2 rounds',()=>{expect(canSignalDisagreement(1)).toBe(false);expect(canSignalDisagreement(2)).toBe(true);});
 it('keeps the evaluatee and transmitted forms read only',()=>{expect(canEditEvaluation({is_evaluator:false,is_evaluatee:true,status:'envoyee'})).toBe(false);expect(canEditEvaluation({is_evaluator:true,status:'envoyee'})).toBe(false);expect(canEditEvaluation({is_evaluator:true,status:'observations_recues'})).toBe(true);});
 it('limits SMART objectives to 5 and requires titles',()=>{expect(validateObjectives(Array.from({length:5},()=>({title:'Objectif'})))).toBe(true);expect(validateObjectives(Array.from({length:6},()=>({title:'Objectif'})))).toBe(false);expect(validateObjectives([{title:' '}])).toBe(false);});
 it('marks 100 percent as attained',()=>{expect(objectiveStatus(100)).toBe('atteint');expect(objectiveStatus(99)).not.toBe('atteint');});
 it('marks at least 50 percent as partially attained',()=>{expect(objectiveStatus(50)).toBe('partiellement_atteint');expect(objectiveStatus(49)).toBe('non_atteint');});
 it('caps PDF selection at 25 collaborators',()=>{expect(validatePdfSelection(Array.from({length:25},(_,i)=>String(i)))).toBe(true);expect(validatePdfSelection(Array.from({length:26},(_,i)=>String(i)))).toBe(false);expect(validatePdfSelection([])).toBe(false);});
 it('assigns March to the previous exercise when it opens in July',()=>{expect(currentExercice(7,new Date(2026,2,10))).toBe(2025);expect(currentExercice(7,new Date(2026,6,1))).toBe(2026);expect(exerciceLabel(2026,7)).toBe('2026/2027');expect(exerciceLabel(2026,1)).toBe('2026');});
 it('neutralizes formulas in traceability CSV fields',()=>{expect(csvCell('=HYPERLINK("url")')).toBe('"\'=HYPERLINK(""url"")"');expect(csvCell('Mission')).toBe('"Mission"');});
});
