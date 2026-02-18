import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Briefcase, FolderOpen, FileText, Users, BarChart3, Shield,
  Check, ChevronRight, Star, ArrowRight,
} from 'lucide-react';
import logoImg from '@/assets/logo.png';

const features = [
  { icon: Briefcase, title: 'Gestion des missions', desc: 'Planifiez, suivez et pilotez vos missions de bout en bout.' },
  { icon: FolderOpen, title: 'Projets & Activités', desc: 'Structurez vos projets avec une hiérarchie flexible.' },
  { icon: FileText, title: 'GED intégrée', desc: 'Versioning, contrôle d\'accès par grade, recherche plein texte.' },
  { icon: Users, title: 'COPIL & Gouvernance', desc: 'Comités de pilotage, comptes rendus et mailing groupé.' },
  { icon: BarChart3, title: 'Timesheets & KPIs', desc: 'Suivi des temps, rentabilité et tableaux de bord analytiques.' },
  { icon: Shield, title: 'Sécurité & Conformité', desc: 'RLS, audit trail, chiffrement et conformité OHADA.' },
];

const plans = [
  { name: 'Starter', price: '49 000', users: '5', missions: '3', popular: false },
  { name: 'Pro', price: '149 000', users: '15', missions: '10', popular: true },
  { name: 'Business', price: '299 000', users: '50', missions: 'Illimité', popular: false },
  { name: 'Enterprise', price: 'Sur devis', users: 'Illimité', missions: 'Illimité', popular: false },
];

const testimonials = [
  { name: 'Koné Amadou', role: 'Associé, Cabinet KA Audit', text: 'MissionFlow a transformé notre façon de gérer les missions d\'audit. Le suivi des équipes est devenu un jeu d\'enfant.' },
  { name: 'Marie-Claire Diallo', role: 'Directrice, MC Conseil', text: 'La gestion des COPIL et le mailing groupé nous font gagner un temps précieux avec nos clients.' },
  { name: 'Jean-Baptiste Ouédraogo', role: 'Chef de mission, Ernst & Co', text: 'Enfin un outil pensé pour les réalités africaines. Le mode hors-ligne est indispensable sur le terrain.' },
];

const faqs = [
  { q: 'MissionFlow est-il adapté aux cabinets d\'audit ?', a: 'Oui, MissionFlow est conçu spécifiquement pour les cabinets d\'audit, de conseil et d\'expertise comptable en Afrique francophone.' },
  { q: 'Peut-on l\'utiliser hors connexion ?', a: 'Oui, le mode offline permet de consulter ses tâches, saisir des timesheets et lire des documents même sans internet.' },
  { q: 'Quelles devises sont supportées ?', a: 'XOF (FCFA UEMOA), XAF (FCFA CEMAC), EUR et USD sont nativement supportés.' },
  { q: 'Comment fonctionne le COPIL ?', a: 'Chaque mission dispose d\'un COPIL avec membres internes et externes. Les comptes rendus, convocations et rapports sont envoyés via le mailing groupé intégré.' },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="MissionFlow" className="h-9 w-9 rounded-lg object-contain" />
            <span className="font-display font-bold text-lg">MissionFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Témoignages</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/login')}>Connexion</Button>
            <Button onClick={() => navigate('/login')}>Démarrer <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-1.5 text-sm text-muted-foreground mb-6">
            <Star className="h-3.5 w-3.5 text-warning" /> Conçu pour l'Afrique francophone
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
            La plateforme de gestion de missions pour les cabinets d'Afrique
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Planifiez vos missions, pilotez vos équipes, gérez vos COPIL et suivez la rentabilité — le tout dans une seule plateforme.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate('/login')} className="text-base px-8">
              Démarrer gratuitement <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8">
              Demander une démo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold">Tout ce dont votre cabinet a besoin</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">Une suite complète pour digitaliser vos missions de conseil et d'audit.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="group hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg font-display">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold">Tarifs adaptés à votre cabinet</h2>
            <p className="mt-3 text-muted-foreground">Tous les prix sont en FCFA par mois.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card key={plan.name} className={`relative ${plan.popular ? 'border-primary shadow-lg ring-1 ring-primary' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground px-3 py-0.5 text-xs font-semibold">
                    Populaire
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="font-display">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    {plan.price !== 'Sur devis' && <span className="text-sm text-muted-foreground"> FCFA/mois</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" /> {plan.users} utilisateurs</div>
                  <div className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" /> {plan.missions} missions</div>
                  <div className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" /> COPIL & Mailing</div>
                  <div className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-success" /> GED avec versioning</div>
                  <Button className="w-full mt-4" variant={plan.popular ? 'default' : 'outline'}>
                    {plan.price === 'Sur devis' ? 'Nous contacter' : 'Choisir'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold">Ils nous font confiance</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card key={t.name}>
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-4 w-4 fill-warning text-warning" />)}
                  </div>
                  <p className="text-sm text-muted-foreground italic mb-4">"{t.text}"</p>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold">Questions fréquentes</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((f) => (
              <Card key={f.q}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">{f.q}</h3>
                  <p className="text-sm text-muted-foreground">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-display text-3xl font-bold mb-4">Prêt à digitaliser vos missions ?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Rejoignez les cabinets qui font confiance à MissionFlow pour piloter leurs engagements.
          </p>
          <Button size="lg" variant="secondary" onClick={() => navigate('/login')} className="text-base px-8">
            Démarrer gratuitement <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src={logoImg} alt="MissionFlow" className="h-8 w-8 rounded-lg object-contain" />
                <span className="font-display font-bold">MissionFlow</span>
              </div>
              <p className="text-sm text-muted-foreground">La plateforme de gestion de missions pour les cabinets d'Afrique francophone.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Produit</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Entreprise</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Carrières</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-sm">Légal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Conditions d'utilisation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Politique de confidentialité</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Mentions légales</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} MissionFlow — D&G CONSEIL. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
