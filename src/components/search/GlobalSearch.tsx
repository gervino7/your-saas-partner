import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem, CommandSeparator,
} from '@/components/ui/command';
import { Briefcase, FolderOpen, CheckSquare, FileText, Users, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  path: string;
  category: string;
}

const categoryConfig: Record<string, { label: string; icon: React.ElementType }> = {
  missions: { label: 'Missions', icon: Briefcase },
  projects: { label: 'Projets', icon: FolderOpen },
  tasks: { label: 'Tâches', icon: CheckSquare },
  documents: { label: 'Documents', icon: FileText },
  users: { label: 'Utilisateurs', icon: Users },
  messages: { label: 'Messages', icon: MessageSquare },
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = useCallback(async (q: string) => {
    setLoading(true);
    const searchTerm = `%${q}%`;
    const all: SearchResult[] = [];

    try {
      const [missions, projects, tasks, documents, users] = await Promise.all([
        supabase.from('missions').select('id, name, code').or(`name.ilike.${searchTerm},code.ilike.${searchTerm}`).limit(5),
        supabase.from('projects').select('id, name, mission_id').ilike('name', searchTerm).limit(5),
        supabase.from('tasks').select('id, title, project_id').ilike('title', searchTerm).limit(5),
        supabase.from('documents').select('id, name').ilike('name', searchTerm).limit(5),
        supabase.from('profiles_safe').select('id, full_name, email').or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm}`).limit(5),
      ]);

      missions.data?.forEach((m) => all.push({ id: m.id, label: m.name, sublabel: m.code ?? undefined, path: `/missions/${m.id}`, category: 'missions' }));
      projects.data?.forEach((p) => all.push({ id: p.id, label: p.name, path: `/projects/${p.id}`, category: 'projects' }));
      tasks.data?.forEach((t) => all.push({ id: t.id, label: t.title, path: `/projects/${t.project_id}`, category: 'tasks' }));
      documents.data?.forEach((d) => all.push({ id: d.id, label: d.name, path: '/documents', category: 'documents' }));
      users.data?.forEach((u) => all.push({ id: u.id, label: u.full_name ?? '', sublabel: u.email ?? undefined, path: '/admin', category: 'users' }));

      setResults(all);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.category] ||= []).push(r);
    return acc;
  }, {});

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    navigate(result.path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Rechercher missions, projets, tâches, documents…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? 'Recherche en cours…' : query.length < 2 ? 'Tapez au moins 2 caractères…' : 'Aucun résultat trouvé.'}
        </CommandEmpty>
        {Object.entries(grouped).map(([cat, items], idx) => {
          const config = categoryConfig[cat];
          if (!config) return null;
          const Icon = config.icon;
          return (
            <div key={cat}>
              {idx > 0 && <CommandSeparator />}
              <CommandGroup heading={config.label}>
                {items.map((item) => (
                  <CommandItem key={item.id} onSelect={() => handleSelect(item)} className="cursor-pointer">
                    <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{item.label}</span>
                      {item.sublabel && <span className="text-xs text-muted-foreground">{item.sublabel}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </div>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
