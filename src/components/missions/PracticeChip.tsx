import { Badge } from '@/components/ui/badge';
import { PRACTICES } from '@/lib/evaluation';
export default function PracticeChip({ practice }: { practice?: string | null }) {
  if (!practice) return null;
  return <Badge variant="outline" className="font-normal text-muted-foreground">{PRACTICES[practice as keyof typeof PRACTICES] ?? practice}</Badge>;
}
