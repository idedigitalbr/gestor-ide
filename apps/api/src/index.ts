import { Elysia } from "elysia";

const app = new Elysia()
  .get("/health", () => ({ ok: true, service: "gestor-ide-api" }))
  .listen(4000);

console.log(
  `gestor-ide-api ouvindo em http://${app.server?.hostname || "localhost"}:${app.server?.port || 4000}`
);

export default app;
export type App = typeof app;
