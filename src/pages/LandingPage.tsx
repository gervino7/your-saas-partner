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
  { name: 'Koné Amadou', role: 'Associé, Cabinet KA Audit', text: 'Mission-DGC a transformé notre façon de gérer les missions d\'audit. Le suivi des équipes est devenu un jeu d\'enfant.' },
  { name: 'Marie-Claire Diallo', role: 'Directrice, MC Conseil', text: 'La gestion des COPIL et le mailing groupé nous font gagner un temps précieux avec nos clients.' },
  { name: 'Jean-Baptiste Ouédraogo', role: 'Chef de mission, Ernst & Co', text: 'Enfin un outil pensé pour les réalités africaines. Le mode hors-ligne est indispensable sur le terrain.' },
];

const faqs = [
  { q: 'Mission-DGC est-il adapté aux cabinets d\'audit ?', a: 'Oui, Mission-DGC est conçu spécifiquement pour les cabinets d\'audit, de conseil et d\'expertise comptable en Afrique francophone.' },
  { q: 'Peut-on l\'utiliser hors connexion ?', a: 'Oui, le mode offline permet de consulter ses tâches, saisir des timesheets et lire des documents même sans internet.' },
  { q: 'Quelles devises sont supportées ?', a: 'XOF (FCFA UEMOA), XAF (FCFA CEMAC), EUR et USD sont nativement supportés.' },
  { q: 'Comment fonctionne le COPIL ?', a: 'Chaque mission dispose d\'un COPIL avec membres internes et externes. Les comptes rendus, convocations et rapports sont envoyés via le mailing groupé intégré.' },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="Mission-DGC" className="h-9 w-9 rounded-xl object-contain" />
            <span className="font-display font-bold text-lg">Mission-DGC</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Témoignages</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/login')} className="font-medium">Connexion</Button>
            <Button onClick={() => navigate('/login')} className="gradient-primary font-semibold">
              Démarrer <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="gradient-hero py-24 md:py-36">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 right-1/4 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-info/15 blur-3xl" />
          </div>
          <div className="container mx-auto px-4 text-center relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm text-white/80 mb-8">
              <Star className="h-3.5 w-3.5 text-warning" /> Conçu pour l'Afrique francophone
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-[1.1] text-white">
              La plateforme de gestion de missions pour les cabinets d'excellence
            </h1>
            <p className="mt-6 text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
              Planifiez vos missions, pilotez vos équipes, gérez vos COPIL et suivez la rentabilité - le tout dans une seule plateforme.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" onClick={() => navigate('/login')} className="text-base px-8 h-12 bg-white text-foreground hover:bg-white/90 font-semibold shadow-elevated">
                Démarrer gratuitement <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12 border-white/20 text-white hover:bg-white/10 bg-transparent">
                Demander une démo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-primary font-semibold text-sm tracking-wide uppercase mb-3">Fonctionnalités</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">Tout ce dont votre cabinet a besoin</h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto text-lg">Une suite complète pour digitaliser vos missions de conseil et d'audit.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <Card key={f.title} className="group shadow-card hover:shadow-card-hover transition-all duration-300 border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/8 text-primary mb-3 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg font-display">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-primary font-semibold text-sm tracking-wide uppercase mb-3">Tarification</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">Tarifs adaptés à votre cabinet</h2>
            <p className="mt-4 text-muted-foreground text-lg">Tous les prix sont en FCFA par mois.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <Card key={plan.name} className={`relative shadow-card hover:shadow-card-hover transition-all duration-300 ${plan.popular ? 'border-primary/40 shadow-elevated ring-1 ring-primary/20' : 'border-border/50'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full gradient-primary text-white px-4 py-1 text-xs font-semibold shadow-md">
                    Populaire
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <CardTitle className="font-display text-lg">{plan.name}</CardTitle>
                  <div className="mt-3">
                    <span className="text-3xl font-bold font-display">{plan.price}</span>
                    {plan.price !== 'Sur devis' && <span className="text-sm text-muted-foreground ml-1">FCFA/mois</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {[`${plan.users} utilisateurs`, `${plan.missions} missions`, 'COPIL & Mailing', 'GED avec versioning'].map((item) => (
                    <div key={item} className="flex items-center gap-2.5 text-sm">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-success/10">
                        <Check className="h-3 w-3 text-success" />
                      </div>
                      {item}
                    </div>
                  ))}
                  <Button className={`w-full mt-6 h-10 font-semibold ${plan.popular ? 'gradient-primary hover:opacity-90' : ''}`} variant={plan.popular ? 'default' : 'outline'}>
                    {plan.price === 'Sur devis' ? 'Nous contacter' : 'Choisir'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-primary font-semibold text-sm tracking-wide uppercase mb-3">Témoignages</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">Ils nous font confiance</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <Card key={t.name} className="shadow-card border-border/50">
                <CardContent className="pt-8 pb-8">
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="h-4 w-4 fill-warning text-warning" />)}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full gradient-primary flex items-center justify-center text-white font-semibold text-sm">
                      {t.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-16">
            <p className="text-primary font-semibold text-sm tracking-wide uppercase mb-3">FAQ</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">Questions fréquentes</h2>
          </div>
          <div className="space-y-4">
            {faqs.map((f) => (
              <Card key={f.q} className="shadow-card border-border/50">
                <CardContent className="py-6 px-6">
                  <h3 className="font-semibold mb-2">{f.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-primary/30 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-5 text-white">Prêt à digitaliser vos missions ?</h2>
          <p className="text-white/60 mb-10 max-w-xl mx-auto text-lg">
            Rejoignez les cabinets qui font confiance à Mission-DGC pour piloter leurs engagements.
          </p>
          <Button size="lg" onClick={() => navigate('/login')} className="text-base px-8 h-12 bg-white text-foreground hover:bg-white/90 font-semibold shadow-elevated">
            Démarrer gratuitement <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-14 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img src={logoImg} alt="Mission-DGC" className="h-8 w-8 rounded-xl object-contain" />
                <span className="font-display font-bold">Mission-DGC</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">La plateforme de gestion de missions pour les cabinets d'Afrique francophone.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Produit</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Entreprise</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">À propos</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Carrières</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Légal</h4>
              <ul className="space-y-2.5 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Conditions d'utilisation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Politique de confidentialité</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Mentions légales</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Mission-DGC - D&G CONSEIL. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
