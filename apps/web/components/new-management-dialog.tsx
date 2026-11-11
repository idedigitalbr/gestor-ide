"use client";

import { useState } from "react";
import { ideCrmClient } from "@gestor-ide/sdk";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function NewManagementDialog({ onClose, connected, onCreated }: {
  onClose: () => void;
  connected: boolean;
  onCreated: () => Promise<void>;
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
    try {
      await ideCrmClient.createManagement({ name: name.trim(), description: description.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar a gestão.");
      setSaving(false);
      return;
    }
    onClose();
    await onCreated();
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova gestão</DialogTitle><DialogDescription>Informe os dados da gestão.</DialogDescription></DialogHeader>
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
