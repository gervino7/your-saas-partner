import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, WifiOff, Zap } from 'lucide-react';
import { useOfflineStore } from '@/stores/offlineStore';

const DataSaverSettings = () => {
  const { dataSaverEnabled, setDataSaverEnabled, isOnline, pendingCount } = useOfflineStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Mode économie de données
        </CardTitle>
        <CardDescription>
          Réduisez la consommation de bande passante pour les connexions limitées.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="data-saver">Économie de données</Label>
            <p className="text-xs text-muted-foreground">
              Désactive les images automatiques, réduit les mises à jour en temps réel
            </p>
          </div>
          <Switch
            id="data-saver"
            checked={dataSaverEnabled}
            onCheckedChange={setDataSaverEnabled}
          />
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-success" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive" />
            )}
            <span>{isOnline ? 'En ligne' : 'Hors ligne'}</span>
          </div>
          {pendingCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {pendingCount} action(s) en attente de synchronisation
            </p>
          )}
        </div>

        {dataSaverEnabled && (
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Chargement automatique des images désactivé</li>
            <li>Heartbeat de présence réduit (5 min au lieu de 1 min)</li>
            <li>Mises à jour temps réel non essentielles désactivées</li>
            <li>Compression renforcée des uploads</li>
            <li>Aperçus de documents désactivés</li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default DataSaverSettings;
