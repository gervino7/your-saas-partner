import DocumentExplorer from '@/components/documents/DocumentExplorer';

export default function ProjectFilesTab({ projectId }: { projectId: string }) {
  return <DocumentExplorer projectId={projectId} />;
}
