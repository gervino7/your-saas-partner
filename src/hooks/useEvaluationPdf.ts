import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
type Args = { kind: 'evaluation'; evaluationId: string } | { kind: 'synthese'; userId: string; exercice: number };
export function useEvaluationPdf() {
  const [loading,setLoading] = useState(false);
  const busy = useRef(false);
  async function download(args: Args) {
    if (busy.current) return;
    busy.current = true; setLoading(true);
    try {
      const session = useAuthStore.getState().session;
      if(!session) throw new Error('Session expirée, reconnectez-vous.');
      const body = args.kind === 'evaluation' ? {kind:args.kind,evaluation_id:args.evaluationId} : {kind:args.kind,user_id:args.userId,exercice:args.exercice};
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-evaluation-pdf`, {method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json',apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY},body:JSON.stringify(body)});
      if(!res.ok) { const j = await res.json().catch(()=>({})); throw new Error(j.error ?? 'Le document n’a pas pu être produit.'); }
      const blob = await res.blob();
      const filename = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? 'evaluation.pdf';
      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    } catch(e) { toast.error(e instanceof Error ? e.message : 'Le document n’a pas pu être produit.'); throw e; }
    finally {busy.current=false;setLoading(false);}
  }
  return {download,loading};
}
