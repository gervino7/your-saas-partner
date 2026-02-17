import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, Download, Search, Shield, BarChart3 } from 'lucide-react';
import ExportMenu from '@/components/common/ExportMenu';
import { useAuthStore } from '@/stores/authStore';
import { usePerformanceData } from '@/hooks/useTaskSubmissions';
import EmptyState from '@/components/common/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const ratingColors: Record<number, string> = {
  1: 'bg-destructive text-destructive-foreground',
  2: 'bg-warning text-warning-foreground',
  3: 'bg-success text-success-foreground',
  4: 'bg-info text-info-foreground',
};

const ratingLabels: Record<number, string> = {
  1: 'Mauvais',
  2: 'À améliorer',
  3: 'Satisfaisant',
  4: 'Excellent',
};

const chartColors = ['hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--success))', 'hsl(var(--info))'];

function initials(name: string) {
  return name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

export default function PerformanceReviewsPage() {
  const profile = useAuthStore((s) => s.profile);
  const gradeLevel = profile?.grade_level ?? 8;
  const canAccess = gradeLevel <= 3; // DA, DM, CM

  const { data: performanceData = [], isLoading } = usePerformanceData();
  const [search, setSearch] = useState('');
  const [filterMission, setFilterMission] = useState('all');

  // Aggregate by employee
  const employeeStats = useMemo(() => {
    const map = new Map<string, {
      id: string;
      name: string;
      avatar: string;
      grade: string;
      ratings: number[];
      missions: Set<string>;
      taskCount: number;
    }>();

    performanceData.forEach((sub: any) => {
      // The submitter here is the person who was evaluated (the task assignee)
      // For validation entries, the submitter is actually the reviewer
      // We need to look at which user was assigned to the task
      const userId = sub.submitter?.id;
      if (!userId) return;

      if (!map.has(userId)) {
        map.set(userId, {
          id: userId,
          name: sub.submitter.full_name,
          avatar: sub.submitter.avatar_url ?? '',
          grade: sub.submitter.grade ?? '',
          ratings: [],
          missions: new Set(),
          taskCount: 0,
        });
      }
      const entry = map.get(userId)!;
      if (sub.rating) entry.ratings.push(sub.rating);
      if (sub.task?.project?.mission?.name) entry.missions.add(sub.task.project.mission.name);
      entry.taskCount++;
    });

    return Array.from(map.values()).map((e) => ({
      ...e,
      avgRating: e.ratings.length > 0 ? e.ratings.reduce((a, b) => a + b, 0) / e.ratings.length : 0,
      missionsStr: Array.from(e.missions).join(', '),
    }));
  }, [performanceData]);

  // All mission names for filter
  const allMissions = useMemo(() => {
    const set = new Set<string>();
    performanceData.forEach((sub: any) => {
      if (sub.task?.project?.mission?.name) set.add(sub.task.project.mission.name);
    });
    return Array.from(set);
  }, [performanceData]);

  // Rating distribution for chart
  const ratingDistribution = useMemo(() => {
    const dist = { 1: 0, 2: 0, 3: 0, 4: 0 };
    performanceData.forEach((sub: any) => {
      if (sub.rating && dist[sub.rating as keyof typeof dist] !== undefined) {
        dist[sub.rating as keyof typeof dist]++;
      }
    });
    return [
      { name: 'Mauvais', value: dist[1], rating: 1 },
      { name: 'À améliorer', value: dist[2], rating: 2 },
      { name: 'Satisfaisant', value: dist[3], rating: 3 },
      { name: 'Excellent', value: dist[4], rating: 4 },
    ];
  }, [performanceData]);

  const filteredStats = useMemo(() => {
    let result = employeeStats;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((e) => e.name.toLowerCase().includes(s));
    }
    if (filterMission !== 'all') {
      result = result.filter((e) => e.missionsStr.includes(filterMission));
    }
    return result.sort((a, b) => b.avgRating - a.avgRating);
  }, [employeeStats, search, filterMission]);

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold font-display">Évaluations de performance</h1>
        <EmptyState icon={Shield} title="Accès restreint" description="Cette section est réservée aux grades DA, DM et CM." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Évaluations de performance</h1>
        <p className="text-muted-foreground">Suivi des notes et de la qualité des livrables par collaborateur.</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{performanceData.length}</div>
            <p className="text-xs text-muted-foreground">Évaluations totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {performanceData.length > 0
                ? (performanceData.reduce((sum: number, s: any) => sum + (s.rating || 0), 0) / performanceData.length).toFixed(1)
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Note moyenne globale</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{employeeStats.length}</div>
            <p className="text-xs text-muted-foreground">Collaborateurs évalués</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{allMissions.length}</div>
            <p className="text-xs text-muted-foreground">Missions couvertes</p>
          </CardContent>
        </Card>
      </div>

      {/* Rating distribution chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Répartition des notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratingDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {ratingDistribution.map((entry, index) => (
                    <Cell key={index} fill={chartColors[index]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 w-48" />
        </div>
        <Select value={filterMission} onValueChange={setFilterMission}>
          <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Mission" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les missions</SelectItem>
            {allMissions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <ExportMenu
          data={filteredStats.map((emp) => ({
            nom: emp.name,
            grade: emp.grade,
            missions: emp.missionsStr,
            taches: emp.taskCount,
            score: emp.avgRating.toFixed(1),
          }))}
          filename="evaluations-performance"
          columns={[
            { key: 'nom', label: 'Collaborateur' },
            { key: 'grade', label: 'Grade' },
            { key: 'missions', label: 'Missions' },
            { key: 'taches', label: 'Tâches évaluées' },
            { key: 'score', label: 'Score moyen' },
          ]}
          title="Évaluations de performance"
        />
      </div>

      {/* Employee table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Collaborateur</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Missions</TableHead>
              <TableHead className="text-center">Tâches évaluées</TableHead>
              <TableHead className="text-center">Score moyen</TableHead>
              <TableHead>Répartition</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement...</TableCell>
              </TableRow>
            ) : filteredStats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune évaluation disponible</TableCell>
              </TableRow>
            ) : (
              filteredStats.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={emp.avatar} />
                        <AvatarFallback className="text-xs">{initials(emp.name)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{emp.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{emp.grade}</Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{emp.missionsStr || '—'}</TableCell>
                  <TableCell className="text-center text-sm">{emp.taskCount}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={ratingColors[Math.round(emp.avgRating)] ?? 'bg-muted text-muted-foreground'}>
                      <Star className="h-3 w-3 mr-0.5" /> {emp.avgRating.toFixed(1)}/4
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((r) => {
                        const count = emp.ratings.filter((x) => x === r).length;
                        return count > 0 ? (
                          <Badge key={r} variant="outline" className={`text-[9px] ${ratingColors[r]}`}>
                            {r}×{count}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
