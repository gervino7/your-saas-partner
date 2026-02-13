import { MoreHorizontal, Download, Share2, Pencil, FolderInput, Trash2, History, Eye } from 'lucide-react';
import { DocumentRow } from '@/hooks/useDocuments';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Props {
  doc: DocumentRow;
  onAction: (action: string, doc: DocumentRow) => void;
}

export default function DocumentActions({ doc, onAction }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onAction('download', doc)}>
          <Download className="h-3.5 w-3.5 mr-2" /> Télécharger
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('share', doc)}>
          <Share2 className="h-3.5 w-3.5 mr-2" /> Partager
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('rename', doc)}>
          <Pencil className="h-3.5 w-3.5 mr-2" /> Renommer
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('move', doc)}>
          <FolderInput className="h-3.5 w-3.5 mr-2" /> Déplacer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onAction('versions', doc)}>
          <History className="h-3.5 w-3.5 mr-2" /> Historique des versions
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction('access_log', doc)}>
          <Eye className="h-3.5 w-3.5 mr-2" /> Historique d'accès
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => onAction('delete', doc)}>
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
