import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSearchUsers } from '@/hooks/useSuperAdmin';
import { Search } from 'lucide-react';
import { format } from 'date-fns';

export default function UtilisateursPage() {
  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const { data: results = [], isFetching } = useSearchUsers(query);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold">Recherche utilisateur</h1>
        <p className="text-sm text-muted-foreground">
          Outil de support. Chaque recherche est enregistrée dans le journal d'audit.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Email ou nom complet (3 caractères min.)"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setQuery(term.trim())}
            />
          </div>
          <Button onClick={() => setQuery(term.trim())} disabled={term.trim().length < 3}>Rechercher</Button>
        </CardContent>
      </Card>

      {query.length >= 3 && (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            {isFetching ? (
              <p className="p-4 text-sm text-muted-foreground">Recherche en cours…</p>
            ) : results.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Aucun utilisateur trouvé.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Dernière connexion</TableHead>
                    <TableHead>Créé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(results as any[]).map((u) => (
                    <TableRow key={u.user_id ?? u.id}>
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell className="text-sm">
                        {u.organization_id ? (
                          <Link className="hover:underline" to={`/super-admin/organisations/${u.organization_id}`}>
                            {u.organization_name ?? u.organization_id}
                          </Link>
                        ) : '-'}
                      </TableCell>
                      <TableCell><Badge variant="outline">{u.grade}</Badge></TableCell>
                      <TableCell className="text-sm">
                        {u.last_login_at ? format(new Date(u.last_login_at), 'dd/MM/yyyy HH:mm') : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {u.created_at ? format(new Date(u.created_at), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
