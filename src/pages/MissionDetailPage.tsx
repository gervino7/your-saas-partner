import { useParams } from 'react-router-dom';

const MissionDetailPage = () => {
  const { id } = useParams();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold font-display">Détail de la mission</h1>
      <p className="text-muted-foreground">Mission ID: {id}</p>
    </div>
  );
};

export default MissionDetailPage;
