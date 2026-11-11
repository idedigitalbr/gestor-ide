import { afterEach, beforeEach, expect, test } from "bun:test";
import {
  clearGestorCache,
  getCachedManagements,
  getCachedProjects,
  getCachedTasks,
  setCachedManagements,
  setCachedProjects,
  setCachedTasks,
} from "./gestor-cache";

const values = new Map();
const storage = {
  get length() { return values.size; },
  key(index) { return [...values.keys()][index] ?? null; },
  getItem(key) { return values.get(key) ?? null; },
  setItem(key, value) { values.set(key, String(value)); },
  removeItem(key) { values.delete(key); },
};

beforeEach(() => {
  globalThis.window = {};
  globalThis.localStorage = storage;
  clearGestorCache();
});

afterEach(() => {
  clearGestorCache();
  delete globalThis.window;
  delete globalThis.localStorage;
});

test("listas vazias substituem dados antigos também no armazenamento", () => {
  setCachedManagements([{ id: "m1", name: "Gestão" }]);
  setCachedProjects([{ id: "p1", name: "Projeto" }]);
  setCachedManagements([]);
  setCachedProjects([]);
  expect(getCachedManagements()).toEqual([]);
  expect(getCachedProjects()).toEqual([]);
  expect(JSON.parse(storage.getItem("gestor_cache_managements"))).toEqual([]);
  expect(JSON.parse(storage.getItem("gestor_cache_projects"))).toEqual([]);
});

test("o cache de tarefas distingue projetos e uma lista vazia", () => {
  setCachedTasks("p1", [{ id: "t1" }]);
  setCachedTasks("p2", []);
  expect(getCachedTasks("p1")).toEqual([{ id: "t1" }]);
  expect(getCachedTasks("p2")).toEqual([]);
  expect(getCachedTasks(null)).toBeNull();
});
