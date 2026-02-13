import { DocumentRow } from '@/hooks/useDocuments';
import { getFileIcon, formatFileSize, getFileExtension } from '@/lib/fileUtils';
import DocumentStatusBadge from './DocumentStatusBadge';
import DocumentActions from './DocumentActions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  documents: DocumentRow[];
  onAction: (action: string, doc: DocumentRow) => void;
}

export default function DocumentListView({ documents, onAction }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead className="hidden md:table-cell">Type</TableHead>
          <TableHead className="hidden sm:table-cell">Taille</TableHead>
          <TableHead className="hidden lg:table-cell">Uploadé par</TableHead>
          <TableHead className="hidden sm:table-cell">Date</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="hidden md:table-cell">Ver.</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id} className="cursor-pointer" onClick={() => onAction('preview', doc)}>
            <TableCell>
              <div className="flex items-center gap-2">
                <span>{getFileIcon(doc.mime_type)}</span>
                <span className="truncate max-w-[200px] font-medium">{doc.name}</span>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
              {getFileExtension(doc.name)}
            </TableCell>
            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
              {formatFileSize(doc.file_size)}
            </TableCell>
            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
              {(doc.uploader as any)?.full_name || '—'}
            </TableCell>
            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
              {doc.created_at ? format(new Date(doc.created_at), 'dd/MM/yy', { locale: fr }) : ''}
            </TableCell>
            <TableCell>
              <DocumentStatusBadge status={doc.status} />
            </TableCell>
            <TableCell className="hidden md:table-cell text-xs">
              v{doc.version || 1}
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <DocumentActions doc={doc} onAction={onAction} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
