"use client";

import { useState } from "react";
import type { CrmProjectManagement, CrmUserProfile } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getCachedSession } from "@/lib/gestor-cache";

export function NewManagementDialog({ onClose, connected, onCreated, currentUser }: {
  onClose: () => void;
  connected: boolean;
  onCreated: (createdManagement?: CrmProjectManagement) => Promise<void> | void;
  currentUser?: CrmUserProfile | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || saving) return;
    if (!connected) {
      setError("Conecte-se ao CRM para criar gestões.");
      return;
    }
    setSaving(true);
    setError("");

    const activeUser = currentUser || getCachedSession();

    try {
      const res = await ideCrmClient.createManagement({
        name: name.trim(),
        description: description.trim(),
        ...(activeUser?.id ? { ownerUserId: activeUser.id, memberIds: [activeUser.id] } : {}),
      });

      const createdManagement = res?.management;

      // Garante que o criador entra automaticamente como responsável (manager)
      if (createdManagement?.id && activeUser?.id) {
        try {
          await ideCrmClient.addManagementMember(createdManagement.id, {
            userId: activeUser.id,
            email: activeUser.email,
            role: "manager",
          });
        } catch (memberErr) {
          console.warn("Aviso ao vincular criador como responsável da gestão:", memberErr);
        }
      }

      onClose();
      await onCreated(createdManagement);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a gestão.");
      setSaving(false);
      return;
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova gestão</DialogTitle>
          <DialogDescription>Informe os dados da gestão. Você será automaticamente vinculado como responsável.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><label htmlFor="management-name" className="text-sm font-medium">Nome</label><Input id="management-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={300} required /></div>
          <div className="space-y-1.5"><label htmlFor="management-description" className="text-sm font-medium">Descrição</label><Textarea id="management-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={5000} /></div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={saving || !name.trim()}>{saving ? "Criando..." : "Criar gestão"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
