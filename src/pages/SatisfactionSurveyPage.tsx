import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Star, Send, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import Loading from '@/components/common/Loading';
import EmptyState from '@/components/common/EmptyState';
import { toast } from 'sonner';

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} onClick={() => onChange(i)} className="focus:outline-none">
            <Star className={`h-6 w-6 transition-colors ${i <= value ? 'text-warning fill-warning' : 'text-muted hover:text-warning/50'}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

const SatisfactionSurveyPage = () => {
  const { token } = useParams<{ token: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    respondent_name: '',
    respondent_email: '',
    overall_rating: 0,
    quality_rating: 0,
    timeliness_rating: 0,
    communication_rating: 0,
    competence_rating: 0,
    value_rating: 0,
    nps_score: 5,
    comments: '',
  });

  const { data: survey, isLoading } = useQuery({
    queryKey: ['survey-token', token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase
        .from('client_surveys')
        .select('*, mission:missions(name, code), client:clients(name)')
        .eq('token', token)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!token,
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loading /></div>;
  if (!survey) return <div className="min-h-screen flex items-center justify-center"><EmptyState icon={Star} title="Enquête introuvable" description="Ce lien d'enquête n'est pas valide." /></div>;
  if (survey.overall_rating != null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Merci !</h2>
            <p className="text-muted-foreground">Votre réponse a déjà été enregistrée.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (form.overall_rating === 0) { toast.error('Veuillez donner une note globale'); return; }
    const { error } = await supabase.from('client_surveys').update({
      respondent_name: form.respondent_name,
      respondent_email: form.respondent_email,
      overall_rating: form.overall_rating,
      quality_rating: form.quality_rating || null,
      timeliness_rating: form.timeliness_rating || null,
      communication_rating: form.communication_rating || null,
      competence_rating: form.competence_rating || null,
      value_rating: form.value_rating || null,
      nps_score: form.nps_score,
      comments: form.comments || null,
      submitted_at: new Date().toISOString(),
    }).eq('id', survey.id);

    if (error) { toast.error('Erreur lors de la soumission'); return; }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Merci pour votre retour !</h2>
            <p className="text-muted-foreground">Votre satisfaction est importante pour nous.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold font-display">Enquête de satisfaction</h1>
          <p className="text-muted-foreground mt-2">
            Mission : <strong>{(survey.mission as any)?.name}</strong> — {(survey.client as any)?.name}
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle>Vos coordonnées</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div><Label>Nom</Label><Input value={form.respondent_name} onChange={e => setForm(f => ({ ...f, respondent_name: e.target.value }))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.respondent_email} onChange={e => setForm(f => ({ ...f, respondent_email: e.target.value }))} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Note globale *</CardTitle></CardHeader>
          <CardContent>
            <StarRating value={form.overall_rating} onChange={v => setForm(f => ({ ...f, overall_rating: v }))} label="Satisfaction générale" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Critères détaillés</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <StarRating value={form.quality_rating} onChange={v => setForm(f => ({ ...f, quality_rating: v }))} label="Qualité des livrables" />
            <StarRating value={form.timeliness_rating} onChange={v => setForm(f => ({ ...f, timeliness_rating: v }))} label="Respect des délais" />
            <StarRating value={form.communication_rating} onChange={v => setForm(f => ({ ...f, communication_rating: v }))} label="Communication" />
            <StarRating value={form.competence_rating} onChange={v => setForm(f => ({ ...f, competence_rating: v }))} label="Compétence de l'équipe" />
            <StarRating value={form.value_rating} onChange={v => setForm(f => ({ ...f, value_rating: v }))} label="Rapport qualité/prix" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recommandation (NPS)</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">Sur une échelle de 0 à 10, recommanderiez-vous notre cabinet ?</p>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">0</span>
              <Slider value={[form.nps_score]} onValueChange={([v]) => setForm(f => ({ ...f, nps_score: v }))} min={0} max={10} step={1} className="flex-1" />
              <span className="font-bold text-lg w-8 text-center">{form.nps_score}</span>
              <span className="text-sm text-muted-foreground">10</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Commentaires</CardTitle></CardHeader>
          <CardContent>
            <Textarea placeholder="Vos remarques, suggestions…" value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} rows={4} />
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={handleSubmit}>
          <Send className="h-4 w-4 mr-2" /> Envoyer mon avis
        </Button>
      </div>
    </div>
  );
};

export default SatisfactionSurveyPage;
