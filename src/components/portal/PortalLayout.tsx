import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Home, CalendarClock, FileText, Receipt, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { usePortalDashboard } from '@/hooks/usePortalSpace';
import logoImg from '@/assets/logo.png';

interface PortalLayoutProps {
  clientName?: string | null;
  children: React.ReactNode;
}

const NAV = [
  { to: '/espace-client', label: 'Accueil', icon: Home, badge: null as null | 'pending' },
  { to: '/espace-client/obligations', label: 'Mes échéances', icon: CalendarClock, badge: 'pending' as const },
  { to: '/espace-client/documents', label: 'Mes documents', icon: FileText, badge: 'new' as const },
  { to: '/espace-client/factures', label: 'Mes factures', icon: Receipt, badge: null },
  { to: '/espace-client/reunions', label: 'Réunions', icon: Video, badge: null },
];

export default function PortalLayout({ clientName, children }: PortalLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: dash } = usePortalDashboard();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  const badgeFor = (kind: 'pending' | 'new' | null) => {
    if (kind === 'pending') return Number(dash?.pending_documents ?? 0);
    if (kind === 'new') return Number(dash?.new_documents ?? 0);
    return 0;
  };

  const name = clientName ?? dash?.client_name ?? null;
  const logo = dash?.organization_logo || logoImg;

  const Badge = ({ count }: { count: number }) =>
    count > 0 ? (
      <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">
        {count}
      </span>
    ) : null;

  return (
    <div className="min-h-screen bg-muted/30 pb-16 md:pb-0">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <button className="flex items-center gap-3 text-left" onClick={() => navigate('/espace-client')}>
            <img src={logo} alt={dash?.organization_name ?? 'Cabinet'} className="h-9 w-9 rounded-lg object-contain" />
            <div>
              <p className="font-display text-sm font-bold leading-tight">{dash?.organization_name ?? 'Espace client'}</p>
              <p className="text-xs text-muted-foreground">Espace client</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            {name && <span className="hidden text-sm font-medium md:inline">{name}</span>}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Se déconnecter</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <nav className="mx-auto hidden max-w-5xl gap-1 px-2 pb-2 md:flex">
          {NAV.map((item) => (
            <Button
              key={item.to}
              variant={location.pathname === item.to ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => navigate(item.to)}
            >
              {item.label}
              <Badge count={badgeFor(item.badge)} />
            </Button>
          ))}
        </nav>

        {menuOpen && (
          <nav className="border-t px-2 py-2 md:hidden">
            {NAV.map((item) => (
              <Button
                key={item.to}
                variant={location.pathname === item.to ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => { setMenuOpen(false); navigate(item.to); }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
                <Badge count={badgeFor(item.badge)} />
              </Button>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 text-center text-xs text-muted-foreground">
        Espace client sécurisé — {dash?.organization_name ?? 'votre cabinet'}
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background md:hidden">
        {NAV.map((item) => {
          const active = location.pathname === item.to;
          const count = badgeFor(item.badge);
          return (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px]',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {count > 0 && (
                <span className="absolute right-3 top-1 h-2 w-2 rounded-full bg-amber-500" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
