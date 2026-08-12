import { useQuery } from '@tanstack/react-query';
import { FolderOpen, FileText, Receipt, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import PortalLayout from '@/components/portal/PortalLayout';

const SECTIONS = [
  { icon: FolderOpen, title: 'Mes dossiers', description: 'Suivi de vos dossiers et échéances.' },
  { icon: FileText, title: 'Mes documents', description: 'Documents partagés par votre cabinet.' },
  { icon: Receipt, title: 'Mes factures', description: 'Historique de vos factures.' },
  { icon: CalendarDays, title: 'Réunions', description: 'Vos prochains rendez-vous.' },
];

export default function PortalHomePage() {
  const { data } = useQuery({
    queryKey: ['portal-home-client'],
    queryFn: async () => {
      const { data: client } = await supabase
        .from('clients')
        .select('name, organization_id')
        .limit(1)
        .maybeSingle();
      if (!client) return { clientName: null as string | null, orgName: null as string | null };
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', client.organization_id)
        .maybeSingle();
      return { clientName: client.name, orgName: org?.name ?? null };
    },
    staleTime: 5 * 60 * 1000,
  });

  return (
    <PortalLayout clientName={data?.clientName}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-2xl">Bienvenue dans votre espace client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {data?.orgName && <p>Espace ouvert par <strong className="text-foreground">{data.orgName}</strong>.</p>}
            <p>
              Vous retrouverez ici vos dossiers, vos documents et vos échanges avec votre cabinet,
              en toute confidentialité.
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          {SECTIONS.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="opacity-90">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
                <p className="mt-2 text-xs text-muted-foreground">Bientôt disponible</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PortalLayout>
  );
}
