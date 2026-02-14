import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DocumentExplorer from '@/components/documents/DocumentExplorer';

export default function ClientDocumentsTab({ clientId }: { clientId: string }) {
  // DocumentExplorer can filter by organization; here we show docs from client missions
  return (
    <Card>
      <CardHeader><CardTitle>Documents associés</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">Documents liés aux missions de ce client (contrats, propositions commerciales, livrables publiés).</p>
        <DocumentExplorer />
      </CardContent>
    </Card>
  );
}
