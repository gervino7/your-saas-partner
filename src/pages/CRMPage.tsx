import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClientsFullList } from '@/hooks/useCRM';
import { useAuthStore } from '@/stores/authStore';
import EmptyState from '@/components/common/EmptyState';
import Loading from '@/components/common/Loading';
import ClientFormDialog from '@/components/crm/ClientFormDialog';

const CRMPage = () => {
  const profile = useAuthStore((s) => s.profile);
  const gradeLevel = profile?.grade_level ?? 8;
  const { data: clients, isLoading } = useClientsFullList();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [countryFilter, setCountryFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  if (gradeLevel > 4) {
    return <EmptyState icon={Building2} title="Accès restreint" description="Cette section est réservée aux superviseurs et grades supérieurs." />;
  }

  if (isLoading) return <Loading />;

  const sectors = [...new Set((clients ?? []).map(c => c.industry).filter(Boolean))];
  const countries = [...new Set((clients ?? []).map(c => c.country).filter(Boolean))];

  const filtered = (clients ?? []).filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.contact_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (sectorFilter !== 'all' && c.industry !== sectorFilter) return false;
    if (countryFilter !== 'all' && c.country !== countryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-display">CRM — Clients</h1>
        {gradeLevel <= 3 && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nouveau client
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un client…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-[180px]"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Secteur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les secteurs</SelectItem>
            {sectors.map(s => <SelectItem key={s} value={s!}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Pays" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les pays</SelectItem>
            {countries.map(c => <SelectItem key={c} value={c!}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Building2} title="Aucun client" description="Aucun client trouvé." />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Secteur</TableHead>
                <TableHead>Contact principal</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Pays</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(client => (
                <TableRow key={client.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/clients/${client.id}`)}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>{client.industry ? <Badge variant="outline">{client.industry}</Badge> : '—'}</TableCell>
                  <TableCell>{client.contact_name || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{client.contact_email || '—'}</TableCell>
                  <TableCell>{client.country || '—'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/admin/clients/${client.id}`); }}>
                      Voir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ClientFormDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
};

export default CRMPage;
