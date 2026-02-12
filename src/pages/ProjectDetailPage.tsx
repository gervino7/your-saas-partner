import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ListTodo, FolderTree, Users, FileText, StickyNote, FileArchive, CalendarDays, Settings } from 'lucide-react';
import { useProject } from '@/hooks/useProject';
import ProjectHeader from '@/components/projects/ProjectHeader';
import TasksTab from '@/components/projects/TasksTab';
import ActivitiesTab from '@/components/projects/ActivitiesTab';
import TeamTab from '@/components/projects/TeamTab';
import PublicationsTab from '@/components/projects/PublicationsTab';
import NotesTab from '@/components/projects/NotesTab';
import ProjectFilesTab from '@/components/projects/ProjectFilesTab';
import ProjectCalendarTab from '@/components/projects/ProjectCalendarTab';
import ProjectSettingsTab from '@/components/projects/ProjectSettingsTab';
import Loading from '@/components/common/Loading';

const ProjectDetailPage = () => {
  const { id } = useParams();
  const { data: project, isLoading } = useProject(id);

  if (isLoading) return <Loading />;
  if (!project) return <p className="text-center text-muted-foreground py-16">Projet introuvable</p>;

  return (
    <div className="space-y-6">
      <ProjectHeader project={project} />

      <Tabs defaultValue="tasks" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="tasks" className="gap-1.5"><ListTodo className="h-4 w-4" /> Tâches</TabsTrigger>
          <TabsTrigger value="activities" className="gap-1.5"><FolderTree className="h-4 w-4" /> Activités</TabsTrigger>
          <TabsTrigger value="team" className="gap-1.5"><Users className="h-4 w-4" /> Équipe</TabsTrigger>
          <TabsTrigger value="files" className="gap-1.5"><FileArchive className="h-4 w-4" /> Fichiers</TabsTrigger>
          <TabsTrigger value="publications" className="gap-1.5"><FileText className="h-4 w-4" /> Publications</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5"><StickyNote className="h-4 w-4" /> Notes</TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1.5"><CalendarDays className="h-4 w-4" /> Calendrier</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-4 w-4" /> Paramètres</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks"><TasksTab projectId={project.id} /></TabsContent>
        <TabsContent value="activities"><ActivitiesTab projectId={project.id} /></TabsContent>
        <TabsContent value="team"><TeamTab projectId={project.id} missionId={project.mission_id} /></TabsContent>
        <TabsContent value="files"><ProjectFilesTab projectId={project.id} /></TabsContent>
        <TabsContent value="publications"><PublicationsTab projectId={project.id} /></TabsContent>
        <TabsContent value="notes"><NotesTab projectId={project.id} /></TabsContent>
        <TabsContent value="calendar"><ProjectCalendarTab projectId={project.id} /></TabsContent>
        <TabsContent value="settings"><ProjectSettingsTab projectId={project.id} /></TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectDetailPage;
