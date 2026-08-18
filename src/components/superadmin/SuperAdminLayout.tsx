import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useIsPlatformAdmin } from '@/hooks/useSuperAdmin';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useOpenTicketsCount } from '@/hooks/useSupport';
import {
  LayoutDashboard, Building2, CreditCard, Package, LifeBuoy, Users, Activity, ScrollText, ShieldCheck, ArrowLeft,
} from 'lucide-react';

const NAV = [
  { label: 'Tableau de bord', to: '/super-admin', icon: LayoutDashboard, end: true },
  { label: 'Organisations', to: '/super-admin/organisations', icon: Building2 },
  { label: 'Abonnements', to: '/super-admin/abonnements', icon: CreditCard },
  { label: 'Plans', to: '/super-admin/plans', icon: Package },
  { label: 'Support', to: '/super-admin/support', icon: LifeBuoy, badge: 'tickets' },
  { label: 'Utilisateurs', to: '/super-admin/utilisateurs', icon: Users },
  { label: 'Santé plateforme', to: '/super-admin/sante', icon: Activity },
  { label: "Journal d'audit", to: '/super-admin/journal', icon: ScrollText },
];

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const { role, isOwner } = useIsPlatformAdmin();
  const openTickets = useOpenTicketsCount();

  const items = isOwner
    ? [...NAV, { label: 'Administrateurs', to: '/super-admin/administrateurs', icon: ShieldCheck }]
    : NAV;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-[hsl(var(--sa-topbar))] text-white">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <ShieldCheck className="h-5 w-5 text-[#E67433]" />
          <span className="font-display text-sm font-semibold sm:text-base">
            Super Administration - Mission-DGC
          </span>
          {role && (
            <Badge variant="outline" className="border-white/40 text-white">
              {role}
            </Badge>
          )}
          <button
            onClick={() => navigate('/')}
            className="ml-auto flex items-center gap-1.5 text-xs text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à l'application
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row">
        <nav className="border-b bg-background p-3 lg:min-h-[calc(100vh-52px)] lg:w-60 lg:border-b-0 lg:border-r">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={(item as any).end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.label}</span>
                  {(item as any).badge === 'tickets' && openTickets > 0 && (
                    <span className="rounded-full bg-[#E67433] px-1.5 py-0.5 text-[10px] font-medium text-white">
                      {openTickets}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
