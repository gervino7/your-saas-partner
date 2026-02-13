import { DocumentRow } from '@/hooks/useDocuments';
import { getFileIcon, formatFileSize } from '@/lib/fileUtils';
import DocumentStatusBadge from './DocumentStatusBadge';
import DocumentActions from './DocumentActions';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Props {
  documents: DocumentRow[];
  onAction: (action: string, doc: DocumentRow) => void;
}

export default function DocumentGridView({ documents, onAction }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="group bg-card rounded-lg border p-3 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onAction('preview', doc)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">{getFileIcon(doc.mime_type)}</span>
            <DocumentActions doc={doc} onAction={onAction} />
          </div>
          <p className="text-sm font-medium truncate" title={doc.name}>{doc.name}</p>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</span>
            <DocumentStatusBadge status={doc.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {doc.created_at ? format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr }) : ''}
          </p>
          {doc.version && doc.version > 1 && (
            <span className="text-xs text-accent font-medium">v{doc.version}</span>
          )}
        </div>
      ))}
    </div>
  );
}
