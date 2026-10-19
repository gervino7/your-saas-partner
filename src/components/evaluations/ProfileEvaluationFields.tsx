import { Label } from '@/components/ui/label';
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from '@/components/ui/select';
import { useEvaluationGrades } from '@/hooks/useEvaluations';
import { PRACTICES } from '@/lib/evaluation';
export default function ProfileEvaluationFields({practice,echelon,onChange}:{practice:string;echelon:string;onChange:(practice:string,echelon:string)=>void}) {
  const q=useEvaluationGrades(practice);
  return <div className="space-y-3"><div><Label>Practice</Label><Select value={practice||undefined} onValueChange={p=>onChange(p,'')}><SelectTrigger><SelectValue placeholder="Choisir une practice"/></SelectTrigger><SelectContent>{Object.entries(PRACTICES).map(([k,v])=><SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div><div><Label>Échelon</Label><Select disabled={!practice||q.isLoading} value={echelon||undefined} onValueChange={e=>onChange(practice,e)}><SelectTrigger><SelectValue placeholder="Choisir un échelon"/></SelectTrigger><SelectContent>{q.data?.map(g=><SelectItem key={g.echelon} value={g.echelon}>{g.echelon} <span className="text-muted-foreground">- {g.family}</span></SelectItem>)}</SelectContent></Select>{q.error&&<p className="text-sm text-destructive">{q.error.message}</p>}</div><p className="text-xs text-muted-foreground">La practice et l'échelon déterminent la grille d'évaluation appliquée. Ils sont distincts du grade, qui porte les droits d'accès.</p></div>;
}
