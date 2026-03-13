import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, BarChart3, Users, Briefcase, DollarSign, Star, Activity, Settings, Building2, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useCommittees } from '@/hooks/useCommittees';
import CommitteeSetup from '@/components/copil/CommitteeSetup';
import MembersList from '@/components/copil/MembersList';
import MeetingsSection from '@/components/copil/MeetingsSection';
import GroupMailComposer from '@/components/copil/GroupMailComposer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Users as UsersIcon, CalendarDays, Mail } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

// Lazy-loaded sections
import AdminDashboard from '@/components/admin/AdminDashboard';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminActivityLogs from '@/components/admin/AdminActivityLogs';
import AdminSettings from '@/components/admin/AdminSettings';
import AdminGrades from '@/components/admin/AdminGrades';

const sections = [
  { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3 },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'clients', label: 'CRM / Clients', icon: Building2 },
  { id: 'missions', label: 'Missions', icon: Briefcase },
  { id: 'codir', label: 'Comité de Direction', icon: Shield },
  { id: 'finance', label: 'Finance', icon: DollarSign },
  { id: 'reviews', label: 'Évaluations', icon: Star },
  { id: 'grades', label: 'Grades', icon: Shield },
  { id: 'logs', label: 'Journaux d\'activité', icon: Activity },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

function CodirSection() {
  const { data: committees, isLoading } = useCommittees();
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const selected = committees?.find((c: any) => c.id === selectedId) ?? committees?.[0];

  if (isLoading) return <div className="animate-pulse h-32 bg-muted rounded-lg" />;

  if (!committees || committees.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyState icon={Shield} title="Comité de Direction" description="Aucun comité de direction n'a été créé." />
        <div className="flex justify-center">
          <CommitteeSetup missionId="" canManage={true} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">{selected?.name}</h3>
          <Badge variant="outline">CODIR</Badge>
        </div>
        <CommitteeSetup missionId="" canManage={true} />
      </div>
      {selected && (
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members"><UsersIcon className="h-4 w-4 mr-1" /> Membres</TabsTrigger>
            <TabsTrigger value="meetings"><CalendarDays className="h-4 w-4 mr-1" /> Réunions</TabsTrigger>
            <TabsTrigger value="mailing"><Mail className="h-4 w-4 mr-1" /> Mailing</TabsTrigger>
          </TabsList>
          <TabsContent value="members" className="mt-4"><MembersList committeeId={selected.id} canManage={true} /></TabsContent>
          <TabsContent value="meetings" className="mt-4"><MeetingsSection committeeId={selected.id} canManage={true} /></TabsContent>
          <TabsContent value="mailing" className="mt-4"><GroupMailComposer committeeId={selected.id} committeeName={selected.name} canManage={true} /></TabsContent>
        </Tabs>
      )}
    </>
  );
}

function AdminSidebarContent({
  activeSection,
  onSelect,
}: {
  activeSection: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-bold font-display mb-4 px-2">Administration</h2>
      {sections.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={cn(
            'flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors text-left',
            activeSection === s.id
              ? 'bg-primary text-primary-foreground font-medium'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <s.icon className="h-4 w-4 shrink-0" />
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}

const AdminPage = () => {
  const profile = useAuthStore((s) => s.profile);
  const gradeLevel = profile?.grade_level ?? 8;
  const canAccess = gradeLevel <= 2;
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sheetOpen, setSheetOpen] = useState(false);

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold font-display">Administration</h1>
        <EmptyState icon={Shield} title="Accès restreint" description="Cette section est réservée aux Directeurs Associés et Directeurs de Mission." />
      </div>
    );
  }

  const handleSelectSection = (id: string) => {
    setActiveSection(id);
    setSheetOpen(false);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <AdminDashboard />;
      case 'users': return <AdminUsers />;
      case 'clients':
        navigate('/admin/clients');
        return <div className="text-muted-foreground">Redirection vers le CRM…</div>;
      case 'missions':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">Vue administrative des missions. Utilisez la page Missions pour la gestion complète.</p>
            <Button onClick={() => navigate('/missions')}>Aller aux Missions</Button>
          </div>
        );
      case 'codir': return <CodirSection />;
      case 'finance':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">Gestion financière : budget, taux journaliers, notes de frais et facturation.</p>
            <Button onClick={() => navigate('/admin/finance')}>Ouvrir la Finance</Button>
          </div>
        );
      case 'reviews':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground">Suivi des notes et de la qualité des livrables par collaborateur.</p>
            <Button onClick={() => navigate('/admin/reviews')}>Voir les évaluations</Button>
          </div>
        );
      case 'grades': return <AdminGrades />;
      case 'logs': return <AdminActivityLogs />;
      case 'settings': return <AdminSettings />;
      default: return null;
    }
  };

  const activeItem = sections.find((s) => s.id === activeSection);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] gap-3 md:gap-6">
      {/* Desktop sidebar */}
      <div className="hidden w-56 shrink-0 space-y-1 lg:block">
        <AdminSidebarContent activeSection={activeSection} onSelect={handleSelectSection} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="mb-6 flex items-center gap-3">
          {/* Mobile menu trigger */}
          <div className="lg:hidden">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4">
                <AdminSidebarContent activeSection={activeSection} onSelect={handleSelectSection} />
              </SheetContent>
            </Sheet>
          </div>
          <h1 className="text-xl font-bold font-display">{activeItem?.label}</h1>
        </div>
        {renderSection()}
      </div>
    </div>
  );
};

export default AdminPage;
