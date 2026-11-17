import { PageNode } from "./page-node";
import { SourceNode } from "./source-node";
import { ActionNode } from "./action-node";
import { EmailNode } from "./email-node";
import { DecisionNode } from "./decision-node";
import { ProcessNode } from "./process-node";
import { StartEndNode } from "./start-end-node";
import { NoteNode } from "./note-node";
import { DatabaseNode } from "./database-node";
import { GroupNode } from "./group-node";
import { TaskNode } from "./task-node";

export const CANVAS_NODE_TYPES = {
  page: PageNode,
  source: SourceNode,
  action: ActionNode,
  email: EmailNode,
  decision: DecisionNode,
  process: ProcessNode,
  startEnd: StartEndNode,
  note: NoteNode,
  database: DatabaseNode,
  group: GroupNode,
  task: TaskNode,
};

export {
  PageNode,
  SourceNode,
  ActionNode,
  EmailNode,
  DecisionNode,
  ProcessNode,
  StartEndNode,
  NoteNode,
  DatabaseNode,
  GroupNode,
  TaskNode,
};
