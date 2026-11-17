import { describe, expect, it } from "bun:test";
import { queryKeys, makeQueryClient, getQueryClient } from "./query-client";
import { queryPersister, CACHE_STORAGE_KEY } from "./persister";

describe("TanStack Query Client & Keys", () => {
  it("generates deterministic and isolated queryKeys for all entities", () => {
    expect(queryKeys.customViews("proj-123")).toEqual([
      "projects",
      "proj-123",
      "custom-views",
    ]);
    expect(queryKeys.customViews(null)).toEqual([
      "projects",
      "all",
      "custom-views",
    ]);
    expect(queryKeys.managements()).toEqual(["managements"]);
    expect(queryKeys.management("mgmt-1")).toEqual(["managements", "mgmt-1"]);
    expect(queryKeys.projects("mgmt-1")).toEqual([
      "projects",
      { managementId: "mgmt-1" },
    ]);
    expect(queryKeys.tasks({ projectId: "proj-1" })).toEqual([
      "tasks",
      { projectId: "proj-1" },
    ]);
  });

  it("configures queryClient with 5min staleTime and 24h gcTime", () => {
    const client = makeQueryClient();
    const defaults = client.getDefaultOptions();

    expect(defaults.queries?.staleTime).toBe(1000 * 60 * 5);
    expect(defaults.queries?.gcTime).toBe(1000 * 60 * 60 * 24);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaults.queries?.retry).toBe(1);
    expect(defaults.mutations?.retry).toBe(0);
  });

  it("getQueryClient returns a valid QueryClient instance", () => {
    const client1 = getQueryClient();
    expect(client1).toBeDefined();
    expect(typeof client1.getQueryData).toBe("function");
  });

  it("queryPersister is configured with the expected storage key", () => {
    expect(queryPersister).toBeDefined();
    expect(CACHE_STORAGE_KEY).toBe("ide_gestor_react_query_cache_v1");
  });
});
