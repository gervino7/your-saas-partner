import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  FileText, History, Paperclip, Activity, Play, Send, Check, RotateCcw,
  Star, Upload, Download, Clock, User,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TASK_STATUS_LABELS, TASK_PRIORITY_LABELS } from '@/types/database';
import { useAuthStore } from '@/stores/authStore';
import { useUpdateTask } from '@/hooks/useProject';
import { useTaskSubmissions, useCreateSubmission } from '@/hooks/useTaskSubmissions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  todo: 'bg-muted text-muted-foreground',
  in_progress: 'bg-info/15 text-info',
  in_review: 'bg-warning/15 text-warning',
  correction: 'bg-destructive/15 text-destructive',
  validated: 'bg-success/15 text-success',
  completed: 'bg-primary/15 text-primary',
};

const priorityColors: Record<string, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info/15 text-info',
  high: 'bg-warning/15 text-warning',
  urgent: 'bg-destructive/15 text-destructive',
};

const ratingConfig = [
  { value: 1, label: 'Mauvais', color: 'bg-destructive text-destructive-foreground', desc: 'Travail insuffisant, erreurs majeures' },
  { value: 2, label: 'À améliorer', color: 'bg-warning text-warning-foreground', desc: 'Travail partiel, corrections importantes' },
  { value: 3, label: 'Satisfaisant', color: 'bg-success text-success-foreground', desc: 'Travail conforme aux attentes' },
  { value: 4, label: 'Excellent', color: 'bg-info text-info-foreground', desc: 'Qualité remarquable' },
];

const submissionIcons: Record<string, any> = {
  submission: Send,
  validation: Check,
  rejection: RotateCcw,
  correction: RotateCcw,
};

function initials(name: string) {
  return name?.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) ?? '?';
}

interface TaskDetailDialogProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectLeadId?: string | null;
}

export default function TaskDetailDialog({ task, open, onOpenChange, projectLeadId }: TaskDetailDialogProps) {
  const profile = useAuthStore((s) => s.profile);
  const updateTask = useUpdateTask();
  const { data: submissions = [], isLoading: subsLoading } = useTaskSubmissions(task?.id);
  const createSubmission = useCreateSubmission();

  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  if (!task) return null;

  const isAssignee = task.assignments?.some((a: any) => a.user?.id === profile?.id);
  const isLead = projectLeadId === profile?.id;
  const status = task.status;

  const handleStart = () => {
    updateTask.mutate({ id: task.id, status: 'in_progress' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <DialogTitle className="text-lg font-display">{task.title}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={statusColors[status] ?? ''}>{TASK_STATUS_LABELS[status as keyof typeof TASK_STATUS_LABELS] ?? status}</Badge>
                <Badge variant="outline" className={priorityColors[task.priority] ?? ''}>
                  {TASK_PRIORITY_LABELS[task.priority as keyof typeof TASK_PRIORITY_LABELS] ?? task.priority}
                </Badge>
                {task.due_date && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(task.due_date), 'd MMM yyyy', { locale: fr })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {task.assignments?.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={a.user?.avatar_url ?? ''} />
                      <AvatarFallback className="text-[8px]">{initials(a.user?.full_name ?? '')}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-muted-foreground">{a.user?.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {isAssignee && status === 'todo' && (
            <Button size="sm" onClick={handleStart} disabled={updateTask.isPending}>
              <Play className="h-4 w-4 mr-1" /> Démarrer
            </Button>
          )}
          {isAssignee && (status === 'in_progress' || status === 'correction') && (
            <Button size="sm" onClick={() => setSubmitDialogOpen(true)}>
              <Send className="h-4 w-4 mr-1" /> Soumettre
            </Button>
          )}
          {isLead && status === 'in_review' && (
            <>
              <Button size="sm" variant="default" onClick={() => setValidateDialogOpen(true)}>
                <Check className="h-4 w-4 mr-1" /> Valider
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRejectDialogOpen(true)}>
                <RotateCcw className="h-4 w-4 mr-1" /> Renvoyer
              </Button>
            </>
          )}
        </div>

        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details" className="gap-1"><FileText className="h-3.5 w-3.5" /> Détails</TabsTrigger>
            <TabsTrigger value="submissions" className="gap-1"><History className="h-3.5 w-3.5" /> Soumissions</TabsTrigger>
            <TabsTrigger value="files" className="gap-1"><Paperclip className="h-3.5 w-3.5" /> Fichiers</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1"><Activity className="h-3.5 w-3.5" /> Activité</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {task.description ? (
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{task.description}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Aucune description</p>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Heures estimées :</span> {task.estimated_hours ?? '—'}</div>
              <div><span className="text-muted-foreground">Heures réelles :</span> {task.actual_hours ?? '—'}</div>
              <div><span className="text-muted-foreground">Compartiment :</span> {task.compartment ?? '—'}</div>
              <div><span className="text-muted-foreground">Créé le :</span> {task.created_at ? format(new Date(task.created_at), 'd MMM yyyy', { locale: fr }) : '—'}</div>
            </div>
          </TabsContent>

          <TabsContent value="submissions" className="mt-4">
            <SubmissionTimeline submissions={submissions} loading={subsLoading} />
          </TabsContent>

          <TabsContent value="files" className="mt-4">
            <TaskFiles submissions={submissions} />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <TaskActivityLog submissions={submissions} task={task} />
          </TabsContent>
        </Tabs>

        {/* Submit Dialog */}
        {submitDialogOpen && (
          <SubmitWorkDialog
            taskId={task.id}
            open={submitDialogOpen}
            onClose={() => setSubmitDialogOpen(false)}
            onSubmitted={() => {
              updateTask.mutate({ id: task.id, status: 'in_review' });
              setSubmitDialogOpen(false);
            }}
          />
        )}

        {/* Validate Dialog */}
        {validateDialogOpen && (
          <ValidateDialog
            taskId={task.id}
            open={validateDialogOpen}
            onClose={() => setValidateDialogOpen(false)}
            onValidated={() => {
              updateTask.mutate({ id: task.id, status: 'completed', completed_at: new Date().toISOString() });
              setValidateDialogOpen(false);
            }}
          />
        )}

        {/* Reject Dialog */}
        {rejectDialogOpen && (
          <RejectDialog
            taskId={task.id}
            open={rejectDialogOpen}
            onClose={() => setRejectDialogOpen(false)}
            onRejected={() => {
              updateTask.mutate({ id: task.id, status: 'correction' });
              setRejectDialogOpen(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Submission Timeline ─── */
function SubmissionTimeline({ submissions, loading }: { submissions: any[]; loading: boolean }) {
  if (loading) return <p className="text-sm text-muted-foreground">Chargement...</p>;
  if (submissions.length === 0) {
    return <p className="text-sm text-muted-foreground italic py-4 text-center">Aucune soumission pour le moment</p>;
  }

  return (
    <div className="relative space-y-4">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
      {submissions.map((sub) => {
        const Icon = submissionIcons[sub.type] ?? Send;
        const ratingInfo = sub.rating ? ratingConfig.find(r => r.value === sub.rating) : null;
        const author = sub.type === 'validation' || sub.type === 'rejection' ? sub.reviewer : sub.submitter;

        return (
          <div key={sub.id} className="relative pl-10">
            <div className="absolute left-2 top-1 w-5 h-5 rounded-full bg-background border-2 border-border flex items-center justify-center">
              <Icon className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {sub.type === 'submission' ? 'Soumission' :
                     sub.type === 'validation' ? 'Validation' :
                     sub.type === 'rejection' ? 'Rejet' : sub.type}
                  </Badge>
                  {ratingInfo && (
                    <Badge className={`text-[10px] ${ratingInfo.color}`}>
                      <Star className="h-3 w-3 mr-0.5" /> {ratingInfo.value}/4 — {ratingInfo.label}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {sub.created_at ? format(new Date(sub.created_at), 'd MMM yyyy HH:mm', { locale: fr }) : ''}
                </span>
              </div>
              {author && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={author.avatar_url ?? ''} />
                    <AvatarFallback className="text-[7px]">{initials(author.full_name ?? '')}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">{author.full_name}</span>
                </div>
              )}
              {sub.comment && <p className="text-sm whitespace-pre-wrap">{sub.comment}</p>}
              {sub.attachments && (() => {
                const att = typeof sub.attachments === 'string' ? JSON.parse(sub.attachments) : sub.attachments;
                return Array.isArray(att) && att.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {att.map((f: any, i: number) => (
                      <a
                        key={i}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline bg-muted px-2 py-1 rounded"
                      >
                        <Download className="h-3 w-3" /> {f.name ?? `Fichier ${i + 1}`}
                      </a>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Task Files ─── */
function TaskFiles({ submissions }: { submissions: any[] }) {
  const allFiles = submissions.flatMap((sub) => {
    const att = typeof sub.attachments === 'string' ? JSON.parse(sub.attachments) : sub.attachments;
    if (!Array.isArray(att)) return [];
    return att.map((f: any) => ({
      ...f,
      submittedAt: sub.created_at,
      submitterName: sub.submitter?.full_name ?? sub.reviewer?.full_name ?? '',
    }));
  });

  if (allFiles.length === 0) {
    return <p className="text-sm text-muted-foreground italic py-4 text-center">Aucun fichier joint</p>;
  }

  return (
    <div className="space-y-2">
      {allFiles.map((f: any, i: number) => (
        <div key={i} className="flex items-center justify-between p-2 border rounded-md">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{f.name ?? `Fichier ${i + 1}`}</p>
              <p className="text-[10px] text-muted-foreground">
                Par {f.submitterName} • {f.submittedAt ? format(new Date(f.submittedAt), 'd MMM yyyy', { locale: fr }) : ''}
              </p>
            </div>
          </div>
          <a href={f.url} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm"><Download className="h-4 w-4" /></Button>
          </a>
        </div>
      ))}
    </div>
  );
}

/* ─── Task Activity Log ─── */
function TaskActivityLog({ submissions, task }: { submissions: any[]; task: any }) {
  const events = [
    { date: task.created_at, label: 'Tâche créée', icon: FileText },
    ...submissions.map((s: any) => ({
      date: s.created_at,
      label: s.type === 'submission' ? 'Travail soumis' :
             s.type === 'validation' ? `Validé (${s.rating}/4)` :
             s.type === 'rejection' ? 'Renvoyé pour correction' : s.type,
      icon: submissionIcons[s.type] ?? Activity,
      user: s.submitter?.full_name ?? s.reviewer?.full_name,
    })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-3">
      {events.map((e, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
            <e.icon className="h-3 w-3 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm">{e.label}</p>
            <p className="text-[10px] text-muted-foreground">
              {e.date ? format(new Date(e.date), 'd MMM yyyy HH:mm', { locale: fr }) : ''}
              {'user' in e && e.user ? ` • ${e.user}` : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Submit Work Dialog ─── */
function SubmitWorkDialog({ taskId, open, onClose, onSubmitted }: {
  taskId: string; open: boolean; onClose: () => void; onSubmitted: () => void;
}) {
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const createSubmission = useCreateSubmission();
  const profile = useAuthStore((s) => s.profile);

  const handleSubmit = async () => {
    setUploading(true);
    try {
      const attachments: any[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `submissions/${taskId}/${Date.now()}_${safeName}`;
        const { error } = await supabase.storage.from('attachments').upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
        attachments.push({ name: file.name, url: urlData.publicUrl, path });
      }

      await createSubmission.mutateAsync({
        task_id: taskId,
        type: 'submission',
        comment: comment || undefined,
        attachments,
        status: 'pending',
      });
      toast.success('Travail soumis avec succès');
      onSubmitted();
    } catch (e: any) {
      toast.error(`Erreur: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Soumettre au chef de projet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Commentaire</Label>
            <Textarea
              placeholder="Décrivez le travail effectué..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
            />
          </div>
          <div>
            <Label>Pièces jointes</Label>
            <Input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="mt-1"
            />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{files.length} fichier(s) sélectionné(s)</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={uploading || createSubmission.isPending}>
              {uploading ? 'Envoi...' : 'Envoyer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Validate Dialog ─── */
function ValidateDialog({ taskId, open, onClose, onValidated }: {
  taskId: string; open: boolean; onClose: () => void; onValidated: () => void;
}) {
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState<number>(3);
  const createSubmission = useCreateSubmission();

  const handleValidate = async () => {
    await createSubmission.mutateAsync({
      task_id: taskId,
      type: 'validation',
      comment: comment || undefined,
      rating,
      status: 'approved',
    });
    toast.success('Tâche validée et notée');
    onValidated();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Valider et noter</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Évaluation</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {ratingConfig.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRating(r.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    rating === r.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Badge className={`${r.color} text-xs`}>{r.value}</Badge>
                    <span className="text-sm font-medium">{r.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Commentaire</Label>
            <Textarea
              placeholder="Commentaire de validation..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button onClick={handleValidate} disabled={createSubmission.isPending}>
              {createSubmission.isPending ? 'Validation...' : 'Valider et noter'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Reject Dialog ─── */
function RejectDialog({ taskId, open, onClose, onRejected }: {
  taskId: string; open: boolean; onClose: () => void; onRejected: () => void;
}) {
  const [comment, setComment] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const createSubmission = useCreateSubmission();

  const handleReject = async () => {
    setUploading(true);
    try {
      const attachments: any[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `submissions/${taskId}/${Date.now()}_${safeName}`;
        const { error } = await supabase.storage.from('attachments').upload(path, file);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
        attachments.push({ name: file.name, url: urlData.publicUrl, path });
      }

      await createSubmission.mutateAsync({
        task_id: taskId,
        type: 'rejection',
        comment: comment || 'Corrections nécessaires',
        attachments,
        status: 'rejected',
      });
      toast.success('Tâche renvoyée pour correction');
      onRejected();
    } catch (e: any) {
      toast.error(`Erreur: ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Renvoyer pour correction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Commentaires et amendements *</Label>
            <Textarea
              placeholder="Détaillez les corrections nécessaires..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={5}
            />
          </div>
          <div>
            <Label>Pièces jointes annotées</Label>
            <Input
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!comment.trim() || uploading || createSubmission.isPending}
            >
              {uploading ? 'Envoi...' : 'Renvoyer'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
