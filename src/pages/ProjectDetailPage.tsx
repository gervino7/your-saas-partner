import { useParams } from 'react-router-dom';

const ProjectDetailPage = () => {
  const { id } = useParams();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">Détail du projet</h1>
      <p className="text-muted-foreground">Projet ID: {id}</p>
    </div>
  );
};

export default ProjectDetailPage;
