"use client";

import { useState } from "react";
import type { CrmProject, CrmProjectManagement, CrmUserProfile } from "@gestor-ide/core";
import { ideCrmClient } from "@gestor-ide/sdk";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { stripManagementPrefix } from "@/lib/list-view-options";
import { getCachedSession } from "@/lib/gestor-cache";

function NewProjectDialogContent({
  onOpenChange,
  managements,
  selectedManagementId,
  connected,
  onCreated,
  currentUser,
}: {
  onOpenChange: (open: boolean) => void;
  managements: CrmProjectManagement[];
  selectedManagementId: string | null;
  connected: boolean;
  onCreated: (createdProject?: CrmProject) => Promise<void> | void;
  currentUser?: CrmUserProfile | null;
}) {
  const [managementId, setManagementId] = useState(selectedManagementId ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!managementId || !name.trim() || saving) return;
    if (!connected) {
      setError("Conecte-se ao CRM para criar projetos.");
      return;
    }
    setSaving(true);
    setError("");

    const activeUser = currentUser || getCachedSession();

    try {
      const res = await ideCrmClient.createProject(managementId, {
        name: name.trim(),
        description: description.trim(),
        ...(activeUser?.id ? { ownerUserId: activeUser.id, memberIds: [activeUser.id] } : {}),
      });

      const createdProject = res?.project;

      // Garante que o criador entra automaticamente como responsável (manager)
      if (createdProject?.id && activeUser?.id) {
        try {
          await ideCrmClient.addProjectMember(createdProject.id, {
            userId: activeUser.id,
            email: activeUser.email,
            role: "manager",
          });
        } catch (memberErr) {
          console.warn("Aviso ao vincular criador como responsável do projeto:", memberErr);
        }
      }

      onOpenChange(false);
      await onCreated(createdProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o projeto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent
      onInteractOutside={(e) => {
        if (saving) e.preventDefault();
      }}
      onEscapeKeyDown={(e) => {
        if (saving) e.preventDefault();
      }}
    >
      <DialogHeader>
        <DialogTitle>Novo projeto</DialogTitle>
        <DialogDescription>Escolha a gestão e informe os dados do projeto. Você será automaticamente vinculado como responsável.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="project-management" className="text-sm font-medium">
            Gestão
          </label>
          <Select value={managementId} onValueChange={setManagementId}>
            <SelectTrigger id="project-management">
              <SelectValue placeholder="Selecione uma gestão" />
            </SelectTrigger>
            <SelectContent>
              {managements.map((management) => (
                <SelectItem key={management.id} value={management.id}>
                  {stripManagementPrefix(management.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="project-name" className="text-sm font-medium">
            Nome
          </label>
          <Input
            id="project-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={300}
            required
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="project-description" className="text-sm font-medium">
            Descrição
          </label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={5000}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !managementId || !name.trim()}>
            {saving ? "Criando..." : "Criar projeto"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

export function NewProjectDialog({
  open,
  onOpenChange,
  managements,
  selectedManagementId,
  connected,
  onCreated,
  currentUser,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  managements: CrmProjectManagement[];
  selectedManagementId: string | null;
  connected: boolean;
  onCreated: (createdProject?: CrmProject) => Promise<void> | void;
  currentUser?: CrmUserProfile | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <NewProjectDialogContent
          key={selectedManagementId ?? "none"}
          onOpenChange={onOpenChange}
          managements={managements}
          selectedManagementId={selectedManagementId}
          connected={connected}
          onCreated={onCreated}
          currentUser={currentUser}
        />
      )}
    </Dialog>
  );
}
