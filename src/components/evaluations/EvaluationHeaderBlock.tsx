import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';

type Header = { objet?: 'mission' | 'dossier'; collaborateur?: string; grade?: string; code_mission?: string | null; evaluateur?: string; departement?: string | null; client?: string | null; periode?: string | null; date_evaluation?: string | null; code_modifiable?: boolean };

function Pair({ label, children }: { label: string; children: React.ReactNode }) {
  return <><dt className="text-muted-foreground font-normal py-1">{label} :</dt><dd className="font-semibold text-foreground py-1 min-w-0 break-words">{children}</dd></>;
}

export function EvaluationHeaderBlock({ evaluationId }: { evaluationId: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['evaluation-header', evaluationId], queryFn: async () => {
    const { data, error } = await supabase.rpc('get_evaluation_header', { _evaluation_id: evaluationId });
    if (error) throw error; return (data ?? {}) as Header;
  } });
  const h = q.data ?? {};
  const [code, setCode] = useState('');
  useEffect(() => { setCode(h.code_mission ?? ''); }, [h.code_mission]);
  async function save() {
    if (code === (h.code_mission ?? '')) return;
    const { error } = await supabase.rpc('set_evaluation_mission_code', { _evaluation_id: evaluationId, _code: code });
    if (error) { toast.error(error.message); setCode(h.code_mission ?? ''); return; }
    await qc.invalidateQueries({ queryKey: ['evaluation-header', evaluationId] });
  }
  const dash = '-';
  return (
    <section className="rounded-md border bg-card px-4 py-3 text-sm grid md:grid-cols-2 gap-x-10">
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 items-center">
        <Pair label="Collaborateur">{h.collaborateur || dash}</Pair>
        <Pair label="Grade">{h.grade || dash}</Pair>
        <Pair label={h.objet === 'dossier' ? 'Code dossier' : 'Code mission'}>{h.code_modifiable
          ? <Input value={code} placeholder="à renseigner" onChange={e => setCode(e.target.value)} onBlur={() => void save()} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} className="h-7 px-1.5 font-semibold border-transparent shadow-none hover:border-input focus-visible:border-input" />
          : (h.code_mission || dash)}</Pair>
        <Pair label="Evaluateur">{h.evaluateur || dash}</Pair>
      </dl>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-3 items-center">
        <Pair label="Département">{h.departement || dash}</Pair>
        <Pair label="Client / Dossier">{h.client || dash}</Pair>
        <Pair label={h.objet === 'dossier' ? 'Période du dossier' : 'Période de la mission'}>{h.periode || dash}</Pair>
        <Pair label="Date d'évaluation">{h.date_evaluation ? (/^\d{4}-\d{2}-\d{2}/.test(h.date_evaluation) ? h.date_evaluation.slice(0,10).split('-').reverse().join('/') : h.date_evaluation) : dash}</Pair>
      </dl>
    </section>
  );
}
