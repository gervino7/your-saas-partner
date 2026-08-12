import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import logoImg from '@/assets/logo.png';

interface PortalLayoutProps {
  clientName?: string | null;
  children: React.ReactNode;
}

export default function PortalLayout({ clientName, children }: PortalLayoutProps) {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Mission-DGC" className="h-9 w-9 rounded-lg object-contain" />
            <div>
              <p className="font-display text-sm font-bold leading-tight">Mission-DGC</p>
              <p className="text-xs text-muted-foreground">Espace client</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {clientName && <span className="hidden text-sm font-medium sm:inline">{clientName}</span>}
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
