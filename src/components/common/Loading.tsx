import { Loader2 } from 'lucide-react';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

const Loading = ({ message = 'Chargement...', fullScreen = false }: LoadingProps) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );

  if (fullScreen) {
    return <div className="flex min-h-screen items-center justify-center">{content}</div>;
  }

  return <div className="flex items-center justify-center p-8">{content}</div>;
};

export default Loading;
