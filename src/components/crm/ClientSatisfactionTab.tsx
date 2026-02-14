import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClientSurveys } from '@/hooks/useCRM';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

function Stars({ value }: { value: number | null }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-4 w-4 ${i <= value ? 'text-warning fill-warning' : 'text-muted'}`} />
      ))}
    </div>
  );
}

export default function ClientSatisfactionTab({ clientId }: { clientId: string }) {
  const { data: surveys, isLoading } = useClientSurveys(clientId);
  const profile = useAuthStore((s) => s.profile);

  const sendManualSurvey = async (missionId: string) => {
    try {
      const token = crypto.randomUUID();
      await supabase.from('client_surveys').insert({
        client_id: clientId,
        mission_id: missionId,
        token,
        organization_id: profile?.organization_id,
      });
      // In production, this would trigger an email via edge function
      toast.success('Enquête de satisfaction envoyée');
    } catch {
      toast.error("Erreur lors de l'envoi");
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Enquêtes de satisfaction</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? <div className="animate-pulse h-20 bg-muted rounded" /> : !surveys?.length ? (
          <p className="text-muted-foreground text-sm">Aucune enquête de satisfaction pour ce client.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mission</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Note globale</TableHead>
                <TableHead>NPS</TableHead>
                <TableHead>Répondant</TableHead>
                <TableHead>Commentaires</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {surveys.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{(s.mission as any)?.name || '—'}</TableCell>
                  <TableCell className="text-sm">{s.submitted_at ? format(new Date(s.submitted_at), 'dd MMM yyyy', { locale: fr }) : '—'}</TableCell>
                  <TableCell><Stars value={s.overall_rating} /></TableCell>
                  <TableCell>{s.nps_score != null ? s.nps_score : '—'}</TableCell>
                  <TableCell>{s.respondent_name || '—'}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">{s.comments || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
