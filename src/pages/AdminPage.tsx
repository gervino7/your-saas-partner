import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Users, CalendarDays, Mail, BarChart3, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useCommittees } from '@/hooks/useCommittees';
import CommitteeSetup from '@/components/copil/CommitteeSetup';
import MembersList from '@/components/copil/MembersList';
import MeetingsSection from '@/components/copil/MeetingsSection';
import GroupMailComposer from '@/components/copil/GroupMailComposer';
import EmptyState from '@/components/common/EmptyState';

const AdminPage = () => {
  const profile = useAuthStore((s) => s.profile);
  const gradeLevel = profile?.grade_level ?? 8;
  const canAccess = gradeLevel <= 2;
  const navigate = useNavigate();

  // For CODIR, use committees without missionId (org-level)
  const { data: committees, isLoading } = useCommittees();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const selected = committees?.find((c: any) => c.id === selectedId) ?? committees?.[0];

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold font-display">Administration</h1>
        <EmptyState icon={Shield} title="Accès restreint" description="Cette section est réservée aux Directeurs Associés et Directeurs de Mission." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Administration</h1>
        <p className="text-muted-foreground">Gérez votre organisation, le Comité de Direction et les paramètres.</p>
      </div>

      <Tabs defaultValue="codir">
        <TabsList>
          <TabsTrigger value="codir" className="flex items-center gap-1"><Shield className="h-4 w-4" /> Comité de Direction</TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-1"><BarChart3 className="h-4 w-4" /> Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-1"><Star className="h-4 w-4" /> Évaluations</TabsTrigger>
        </TabsList>

        <TabsContent value="codir" className="mt-6 space-y-6">
          {isLoading ? (
            <div className="animate-pulse h-32 bg-muted rounded-lg" />
          ) : !committees || committees.length === 0 ? (
            <div className="space-y-4">
              <EmptyState icon={Shield} title="Comité de Direction" description="Aucun comité de direction n'a été créé pour votre organisation." />
              <div className="flex justify-center">
                {/* Empty missionId creates org-level committee */}
                <CommitteeSetup missionId="" canManage={true} />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold">{selected?.name}</h3>
                  <Badge variant="outline">CODIR</Badge>
                </div>
                <CommitteeSetup missionId="" canManage={true} />
              </div>

              {selected && (
                <Tabs defaultValue="members">
                  <TabsList>
                    <TabsTrigger value="members"><Users className="h-4 w-4 mr-1" /> Membres</TabsTrigger>
                    <TabsTrigger value="meetings"><CalendarDays className="h-4 w-4 mr-1" /> Réunions</TabsTrigger>
                    <TabsTrigger value="mailing"><Mail className="h-4 w-4 mr-1" /> Mailing</TabsTrigger>
                  </TabsList>
                  <TabsContent value="members" className="mt-4">
                    <MembersList committeeId={selected.id} canManage={true} />
                  </TabsContent>
                  <TabsContent value="meetings" className="mt-4">
                    <MeetingsSection committeeId={selected.id} canManage={true} />
                  </TabsContent>
                  <TabsContent value="mailing" className="mt-4">
                    <GroupMailComposer committeeId={selected.id} committeeName={selected.name} canManage={true} />
                  </TabsContent>
                </Tabs>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Vue d'ensemble</CardTitle>
              <CardDescription>Dashboard consolidé des missions en cours.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Le dashboard consolidé sera disponible prochainement.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Évaluations de performance</CardTitle>
              <CardDescription>Suivi des notes et de la qualité des livrables par collaborateur.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate('/admin/reviews')}>
                <Star className="h-4 w-4 mr-1" /> Voir les évaluations détaillées
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPage;
