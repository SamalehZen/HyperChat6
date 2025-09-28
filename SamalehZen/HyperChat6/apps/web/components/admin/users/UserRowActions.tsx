"use client";

import { useState } from 'react';
import { Button, useToast, AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from '@repo/ui';
import type { UserRow } from './UserTable';
import { ActivityDialog } from './ActivityDialog';
import { ManageAccessDialog } from './ManageAccessDialog';
import { ResetPasswordDialog } from './ResetPasswordDialog';

export function UserRowActions({ user, onChanged }: { user: UserRow; onChanged: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showActivity, setShowActivity] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);
  const [confirmRole, setConfirmRole] = useState(false);
  const [confirmUnlock, setConfirmUnlock] = useState(false);
  const { toast } = useToast();

  const doAction = async (action: string, payload?: any, labels?: { success?: string; error?: string }) => {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: action === 'delete' ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: action === 'delete' ? undefined : JSON.stringify({ action, ...payload }),
      });
      if (!res.ok) {
        let msg = '';
        try { const data = await res.json(); msg = data?.error || ''; } catch {}
        toast({ title: labels?.error || 'Erreur', description: msg || res.statusText });
        return false;
      }
      toast({ title: labels?.success || 'Action effectuée' });
      onChanged();
      return true;
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="xs" variant="secondary" onClick={() => setShowActivity(true)} disabled={loading !== null}>Détails</Button>
      <Button size="xs" variant="secondary" onClick={() => setShowAccess(true)} disabled={loading !== null}>Gérer l’accès aux modèles</Button>
      <Button size="xs" variant="secondary" onClick={() => setShowReset(true)} disabled={loading !== null}>Réinitialiser</Button>
      <Button size="xs" variant="secondary" onClick={() => setConfirmSuspend(true)} disabled={loading !== null}>{user.isSuspended ? 'Activer' : 'Suspendre'}</Button>
      {user.isLocked && (
        <Button size="xs" variant="secondary" onClick={() => setConfirmUnlock(true)} disabled={loading !== null}>Réactiver</Button>
      )}
      <Button size="xs" variant="secondary" onClick={() => setConfirmRole(true)} disabled={loading !== null}>Rôle: {user.role}</Button>
      <Button size="xs" variant="destructive" onClick={() => setConfirmDelete(true)} disabled={loading !== null}>Supprimer</Button>

      <ActivityDialog user={user} open={showActivity} onOpenChange={setShowActivity} />
      <ManageAccessDialog user={user} open={showAccess} onOpenChange={setShowAccess} onSaved={onChanged} />
      <ResetPasswordDialog open={showReset} onOpenChange={setShowReset} email={user.email} onSubmit={async (password) => {
        await doAction('reset_password', { password }, { success: `Mot de passe réinitialisé pour ${user.email}` });
      }} />

      {/* Confirm Suspend/Activate */}
      <AlertDialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{user.isSuspended ? 'Activer le compte ?' : 'Suspendre le compte ?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {user.isSuspended ? 'Le compte sera réactivé.' : 'L’utilisateur ne pourra plus se connecter.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading !== null}>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={loading !== null} onClick={async () => {
              const ok = await doAction(user.isSuspended ? 'unsuspend' : 'suspend', undefined, {
                success: user.isSuspended ? `Compte activé — ${user.email}` : `Compte suspendu — ${user.email}`,
              });
              if (ok) setConfirmSuspend(false);
            }}>{user.isSuspended ? 'Activer' : 'Suspendre'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Role Change */}
      <AlertDialog open={confirmRole} onOpenChange={setConfirmRole}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer le rôle ?</AlertDialogTitle>
            <AlertDialogDescription>
              {user.email} — nouveau rôle: {user.role === 'admin' ? 'user' : 'admin'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading !== null}>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={loading !== null} onClick={async () => {
              const nextRole = user.role === 'admin' ? 'user' : 'admin';
              const ok = await doAction('update_role', { role: nextRole }, { success: `Rôle mis à jour (${nextRole}) — ${user.email}` });
              if (ok) setConfirmRole(false);
            }}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Unlock */}
      <AlertDialog open={confirmUnlock} onOpenChange={setConfirmUnlock}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Réactiver le compte ?</AlertDialogTitle>
            <AlertDialogDescription>
              {user.email} — lever le verrouillage et permettre la reconnexion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading !== null}>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={loading !== null} onClick={async () => {
              setLoading('unlock');
              try {
                const res = await fetch(`/api/admin/users/${user.id}/unlock`, { method: 'POST' });
                if (!res.ok) {
                  let msg = '';
                  try { const data = await res.json(); msg = data?.error || ''; } catch {}
                  toast({ title: 'Erreur', description: msg || res.statusText });
                } else {
                  toast({ title: `Compte réactivé — ${user.email}` });
                  onChanged();
                  setConfirmUnlock(false);
                }
              } finally {
                setLoading(null);
              }
            }}>Réactiver</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l’utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Action irréversible. Confirmer la suppression de {user.email}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading !== null}>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={loading !== null} onClick={async () => {
              const ok = await doAction('delete', undefined, { success: `Utilisateur supprimé — ${user.email}` });
              if (ok) setConfirmDelete(false);
            }}>Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
