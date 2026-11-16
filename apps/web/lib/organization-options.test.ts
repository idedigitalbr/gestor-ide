import { describe, expect, it } from "bun:test";
import {
  filterManagements,
  sortManagements,
  filterProjects,
  sortProjects,
  sortTasks,
  extractManagementTags,
  extractProjectTags,
  countActiveManagementFilters,
  countActiveProjectFilters,
  DEFAULT_MANAGEMENT_FILTERS,
  DEFAULT_PROJECT_FILTERS,
} from "./organization-options";
import type { CrmProject, CrmProjectManagement, Task } from "@gestor-ide/core";

describe("organization-options", () => {
  const sampleManagements: CrmProjectManagement[] = [
    {
      id: "m-1",
      name: "Gestão Comercial #vendas",
      code: "COM",
      description: "Operações e vendas",
      visibility: "company",
      status: "active",
      createdAt: "2026-01-10T10:00:00Z",
      updatedAt: "2026-02-15T10:00:00Z",
      _count: { projects: 5 },
    },
    {
      id: "m-2",
      name: "Gestão Financeira #financeiro",
      code: "FIN",
      description: "Contabilidade e pagamentos",
      visibility: "private",
      status: "paused",
      createdAt: "2026-01-01T10:00:00Z",
      updatedAt: "2026-03-01T10:00:00Z",
      _count: { projects: 12 },
    },
    {
      id: "m-3",
      name: "Alpha Gestão Tech #ti #infra",
      code: "TECH",
      description: "Engenharia e produto",
      visibility: "team",
      status: "completed",
      createdAt: "2026-02-20T10:00:00Z",
      updatedAt: "2026-02-20T10:00:00Z",
      _count: { projects: 2 },
    },
  ];

  it("extrai tags de gestões corretamente", () => {
    const tags = extractManagementTags(sampleManagements);
    expect(tags).toContain("vendas");
    expect(tags).toContain("financeiro");
    expect(tags).toContain("ti");
    expect(tags).toContain("infra");
  });

  it("ordena gestões alfabeticamente A-Z e Z-A", () => {
    const asc = sortManagements(sampleManagements, "name-asc");
    expect(asc[0].name).toBe("Alpha Gestão Tech #ti #infra");
    expect(asc[2].name).toBe("Gestão Financeira #financeiro");

    const desc = sortManagements(sampleManagements, "name-desc");
    expect(desc[0].name).toBe("Gestão Financeira #financeiro");
    expect(desc[2].name).toBe("Alpha Gestão Tech #ti #infra");
  });

  it("ordena gestões por quantidade de projetos (numérico)", () => {
    const mostProjects = sortManagements(sampleManagements, "projects-desc");
    expect(mostProjects[0].id).toBe("m-2"); // 12 projects
    expect(mostProjects[1].id).toBe("m-1"); // 5 projects
    expect(mostProjects[2].id).toBe("m-3"); // 2 projects

    const leastProjects = sortManagements(sampleManagements, "projects-asc");
    expect(leastProjects[0].id).toBe("m-3"); // 2 projects
  });

  it("ordena gestões por data de criação e atualização", () => {
    const newestCreated = sortManagements(sampleManagements, "created-desc");
    expect(newestCreated[0].id).toBe("m-3"); // Feb 20

    const oldestCreated = sortManagements(sampleManagements, "created-asc");
    expect(oldestCreated[0].id).toBe("m-2"); // Jan 01

    const latestUpdated = sortManagements(sampleManagements, "updated-desc");
    expect(latestUpdated[0].id).toBe("m-2"); // Mar 01
  });

  it("filtra gestões por visibilidade, status e tags", () => {
    const filteredVis = filterManagements(
      sampleManagements,
      { ...DEFAULT_MANAGEMENT_FILTERS, visibility: "private" },
      ""
    );
    expect(filteredVis.length).toBe(1);
    expect(filteredVis[0].id).toBe("m-2");

    const filteredStatus = filterManagements(
      sampleManagements,
      { ...DEFAULT_MANAGEMENT_FILTERS, status: "completed" },
      ""
    );
    expect(filteredStatus.length).toBe(1);
    expect(filteredStatus[0].id).toBe("m-3");

    const filteredTag = filterManagements(
      sampleManagements,
      { ...DEFAULT_MANAGEMENT_FILTERS, tag: "ti" },
      ""
    );
    expect(filteredTag.length).toBe(1);
    expect(filteredTag[0].id).toBe("m-3");
  });

  it("ordena projetos por prazo, prioridade e tarefas", () => {
    const sampleProjects: CrmProject[] = [
      {
        id: "p-1",
        projectManagementId: "m-1",
        name: "Website Institucional #marketing",
        status: "active",
        priority: "low",
        dueDate: "2026-06-01T00:00:00Z",
        _count: { tasks: 10 },
      },
      {
        id: "p-2",
        projectManagementId: "m-1",
        name: "App Mobile #app",
        status: "in_progress",
        priority: "urgent",
        dueDate: "2026-04-01T00:00:00Z",
        _count: { tasks: 50 },
      },
      {
        id: "p-3",
        projectManagementId: "m-1",
        name: "Dashboard CRM #bi",
        status: "planning",
        priority: "high",
        dueDate: "2026-05-01T00:00:00Z",
        _count: { tasks: 25 },
      },
    ];

    const sortedPriority = sortProjects(sampleProjects, "priority-desc");
    expect(sortedPriority[0].id).toBe("p-2"); // urgent
    expect(sortedPriority[1].id).toBe("p-3"); // high
    expect(sortedPriority[2].id).toBe("p-1"); // low

    const sortedDue = sortProjects(sampleProjects, "dueDate-asc");
    expect(sortedDue[0].id).toBe("p-2"); // April
    expect(sortedDue[1].id).toBe("p-3"); // May
    expect(sortedDue[2].id).toBe("p-1"); // June

    const sortedTasks = sortProjects(sampleProjects, "tasks-desc");
    expect(sortedTasks[0].id).toBe("p-2"); // 50 tasks
    expect(sortedTasks[1].id).toBe("p-3"); // 25 tasks
    expect(sortedTasks[2].id).toBe("p-1"); // 10 tasks
  });

  it("conta filtros ativos com precisão", () => {
    expect(countActiveManagementFilters(DEFAULT_MANAGEMENT_FILTERS)).toBe(0);
    expect(
      countActiveManagementFilters({
        ...DEFAULT_MANAGEMENT_FILTERS,
        visibility: "company",
        status: "active",
      })
    ).toBe(2);

    expect(countActiveProjectFilters(DEFAULT_PROJECT_FILTERS)).toBe(0);
    expect(
      countActiveProjectFilters({
        ...DEFAULT_PROJECT_FILTERS,
        priority: "urgent",
        dueDateRange: "today",
      })
    ).toBe(2);
  });
});
