import DOMPurify from 'dompurify';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Mail, Send, Clock, Eye, CheckCircle, AlertCircle, History, Bold, Italic, Underline, List, ListOrdered, Paperclip, X, FileText, Trash2, EyeIcon, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCommitteeMembers, useMailingGroup, useEnsureMailingGroup,
  useCreateGroupEmail, useSendGroupEmail, useGroupEmails,
} from '@/hooks/useCommittees';

const STATUS_ICONS: Record<string, any> = {
  draft: Clock, sent: Send, delivered: CheckCircle, opened: Eye, error: AlertCircle,
};
const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', sending: 'Envoi...', sent: 'Envoyé', delivered: 'Délivré', opened: 'Ouvert', error: 'Erreur',
};

interface Attachment {
  name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
}

interface Props {
  committeeId: string;
  committeeName: string;
  missionName?: string;
  canManage: boolean;
}

/* ── Simple rich-text toolbar using contenteditable ── */
function RichTextEditor({ value, onChange, placeholder }: {
  value: string; onChange: (html: string) => void; placeholder?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (editorRef.current && !isInternalChange.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = () => {
    isInternalChange.current = true;
    onChange(editorRef.current?.innerHTML ?? '');
  };

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    handleInput();
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center gap-1 p-1 border-b bg-muted/30">
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => exec('bold')} title="Gras">
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => exec('italic')} title="Italique">
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => exec('underline')} title="Souligné">
          <Underline className="h-3.5 w-3.5" />
        </Button>
        <Separator orientation="vertical" className="h-5 mx-1" />
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => exec('insertUnorderedList')} title="Liste">
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => exec('insertOrderedList')} title="Liste numérotée">
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="min-h-[200px] p-3 text-sm focus:outline-none prose prose-sm max-w-none"
        data-placeholder={placeholder}
        style={{ minHeight: 200 }}
      />
    </div>
  );
}

/* ── Email detail viewer ── */
function EmailViewDialog({ email, open, onOpenChange }: { email: any; open: boolean; onOpenChange: (o: boolean) => void }) {
  const attachments: Attachment[] = (email?.attachments as Attachment[]) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{email?.subject}</DialogTitle>
          <DialogDescription>
            Envoyé le {email?.sent_at ? format(new Date(email.sent_at), 'dd/MM/yyyy à HH:mm', { locale: fr }) : email?.created_at ? format(new Date(email.created_at), 'dd/MM/yyyy à HH:mm', { locale: fr }) : '—'}
            {' • '}{email?.profiles?.full_name ?? 'Inconnu'}
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(email?.body ?? '', { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'b', 'i', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'a', 'span', 'div'], ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'] }) }} />
        {attachments.length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2">Pièces jointes ({attachments.length})</p>
              <div className="space-y-1">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{att.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {email?.delivery_report && Object.keys(email.delivery_report).length > 0 && (
          <>
            <Separator />
            <div>
              <p className="text-sm font-medium mb-2">Rapport de livraison</p>
              <div className="text-xs text-muted-foreground space-y-1">
                {Object.entries(email.delivery_report as Record<string, any>).map(([emailAddr, info]: [string, any]) => (
                  <div key={emailAddr} className="flex items-center justify-between p-1.5 border rounded">
                    <span className="truncate">{emailAddr}</span>
                    <Badge variant={info.status === 'sent' || info.status === 'delivered' ? 'default' : 'destructive'} className="text-xs">
                      {STATUS_LABELS[info.status] ?? info.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

const GroupMailComposer = ({ committeeId, committeeName, missionName, canManage }: Props) => {
  const profile = useAuthStore((s) => s.profile);
  const qc = useQueryClient();
  const { data: members } = useCommitteeMembers(committeeId);
  const { data: mailingGroup } = useMailingGroup(committeeId);
  const ensureGroup = useEnsureMailingGroup();
  const createEmail = useCreateGroupEmail();
  const sendEmail = useSendGroupEmail();
  const { data: emailHistory } = useGroupEmails(mailingGroup?.id);

  const [composeOpen, setComposeOpen] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '', cc: '' });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View / Delete state
  const [viewEmail, setViewEmail] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  // Edit (resend) state
  const [editEmail, setEditEmail] = useState<any>(null);

  useEffect(() => {
    if (committeeId && !mailingGroup) {
      ensureGroup.mutate({ committeeId, name: committeeName });
    }
  }, [committeeId, mailingGroup]);

  const recipients = members?.map((m: any) => ({
    name: m.is_external ? m.external_name : m.profiles?.full_name,
    email: m.is_external ? m.external_email : m.profiles?.email,
  })) ?? [];

  const defaultSubject = `Rapport COPIL - ${missionName ?? committeeName} - ${format(new Date(), 'dd/MM/yyyy')}`;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `email-attachments/${profile?.organization_id}/${Date.now()}_${safeName}`;
        
        const { error } = await supabase.storage.from('documents').upload(path, file);
        if (error) {
          toast.error(`Erreur upload: ${file.name}`);
          continue;
        }

        setAttachments(prev => [...prev, {
          name: file.name,
          file_path: path,
          mime_type: file.type,
          file_size: file.size,
        }]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const handleSend = async () => {
    if (!mailingGroup) return;
    const email = await createEmail.mutateAsync({
      group_id: mailingGroup.id,
      subject: form.subject || defaultSubject,
      body: form.body,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    await sendEmail.mutateAsync(email.id);
    setComposeOpen(false);
    setForm({ subject: '', body: '', cc: '' });
    setAttachments([]);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('group_emails').delete().eq('id', deleteId);
    if (error) {
      toast.error('Impossible de supprimer: ' + error.message);
    } else {
      toast.success('Email supprimé');
      qc.invalidateQueries({ queryKey: ['group-emails'] });
    }
    setDeleteId(null);
  };

  const handleEditResend = async () => {
    if (!mailingGroup || !editEmail) return;
    const email = await createEmail.mutateAsync({
      group_id: mailingGroup.id,
      subject: form.subject || editEmail.subject,
      body: form.body,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    await sendEmail.mutateAsync(email.id);
    setEditEmail(null);
    setComposeOpen(false);
    setForm({ subject: '', body: '', cc: '' });
    setAttachments([]);
    toast.success('Email renvoyé');
  };

  const openEdit = (e: any) => {
    setEditEmail(e);
    setForm({ subject: e.subject, body: e.body, cc: '' });
    setAttachments((e.attachments as Attachment[]) ?? []);
    setComposeOpen(true);
  };

  const openCompose = () => {
    setEditEmail(null);
    setForm({ subject: '', body: '', cc: '' });
    setAttachments([]);
    setComposeOpen(true);
  };

  if (!canManage) return null;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2"><Mail className="h-5 w-5" /> Mailing groupé</CardTitle>
          <Button size="sm" onClick={openCompose}><Send className="h-4 w-4 mr-2" /> Envoyer un rapport</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><History className="h-4 w-4" /> Historique des envois</p>
            {emailHistory && emailHistory.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Objet</TableHead>
                    <TableHead>Expéditeur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailHistory.map((e: any) => {
                    const Icon = STATUS_ICONS[e.status ?? 'draft'] ?? Clock;
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{format(new Date(e.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                        <TableCell className="font-medium">{e.subject}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{e.profiles?.full_name ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex items-center gap-1 w-fit">
                            <Icon className="h-3 w-3" />{STATUS_LABELS[e.status ?? 'draft']}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Visualiser" onClick={() => setViewEmail(e)}>
                              <EyeIcon className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Modifier et renvoyer" onClick={() => openEdit(e)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" title="Supprimer" onClick={() => setDeleteId(e.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-6 text-sm">Aucun envoi</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compose / Edit Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editEmail ? 'Modifier et renvoyer' : `Envoyer au ${committeeName}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Destinataires ({recipients.length})</Label>
              <div className="flex flex-wrap gap-1 mt-1 p-2 border rounded-md bg-muted/50 max-h-24 overflow-y-auto">
                {recipients.map((r, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{r.name} &lt;{r.email}&gt;</Badge>
                ))}
              </div>
            </div>
            <div><Label>Cc (optionnel)</Label><Input value={form.cc} onChange={(e) => setForm((p) => ({ ...p, cc: e.target.value }))} placeholder="email1@example.com, email2@example.com" /></div>
            <div><Label>Objet</Label><Input value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder={defaultSubject} /></div>
            <div>
              <Label>Message</Label>
              <RichTextEditor
                value={form.body}
                onChange={(html) => setForm((p) => ({ ...p, body: html }))}
                placeholder="Rédigez votre message..."
              />
            </div>

            {/* Attachments */}
            <div>
              <Label>Pièces jointes</Label>
              <div className="mt-1 space-y-2">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border rounded-md bg-muted/30 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{att.name}</span>
                    <span className="text-muted-foreground text-xs">{formatFileSize(att.file_size)}</span>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeAttachment(i)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Paperclip className="h-4 w-4 mr-2" />{uploading ? 'Upload...' : 'Joindre un fichier'}
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setComposeOpen(false); setEditEmail(null); }}>Annuler</Button>
              <Button
                onClick={editEmail ? handleEditResend : handleSend}
                disabled={!form.body || sendEmail.isPending || createEmail.isPending}
              >
                <Send className="h-4 w-4 mr-2" />{sendEmail.isPending ? 'Envoi...' : editEmail ? 'Renvoyer' : 'Envoyer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <EmailViewDialog email={viewEmail} open={!!viewEmail} onOpenChange={(o) => !o && setViewEmail(null)} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet email ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. L'historique de cet envoi sera supprimé définitivement.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GroupMailComposer;
