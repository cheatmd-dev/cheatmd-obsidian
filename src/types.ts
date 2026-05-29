export interface PromptVariable {
  name: string;
  header: string;
  placeholder: string;
  options: string[];
  multi: boolean;
}

// Message sent by the cheatmd runner on the JSON-RPC `completed` notification.
export interface RunCompletedParams {
  status: "success" | "failure";
  command: string;
  stdout: string;
  stderr: string;
  error?: string;
  exit_code: number;
}

export interface CachedRun {
  query: string;
  params: RunCompletedParams;
}

export type StatusBarState = "clean" | "warnings" | "missing";

// Markdown block metadata extracted by the post-processor and forwarded to the
// runner; identifies which sheet entry a play button belongs to.
export interface BlockMeta {
  heading: string;
  fenceTitle: string;
  lineStart: number;
}

export interface RpcMessage {
  method?: string;
  params?: unknown;
  id?: unknown;
}

export function isPromptRpcMessage(msg: RpcMessage): msg is RpcMessage & { params: { variables: PromptVariable[] } } {
  if (msg.method !== "prompt" || !msg.params || typeof msg.params !== "object") {
    return false;
  }
  const params = msg.params as Record<string, unknown>;
  return Array.isArray(params.variables) && params.variables.every(isPromptVariable);
}

export function isCompletedRpcMessage(msg: RpcMessage): msg is RpcMessage & { params: RunCompletedParams } {
  if (msg.method !== "completed" || !msg.params || typeof msg.params !== "object") {
    return false;
  }
  const params = msg.params as Record<string, unknown>;
  return (params.status === "success" || params.status === "failure") &&
         typeof params.command === "string" &&
         typeof params.stdout === "string" &&
         typeof params.stderr === "string" &&
         typeof params.exit_code === "number";
}

function isPromptVariable(value: unknown): value is PromptVariable {
  if (!value || typeof value !== "object") {
    return false;
  }
  const variable = value as Record<string, unknown>;
  return typeof variable.name === "string" &&
         typeof variable.header === "string" &&
         typeof variable.placeholder === "string" &&
         Array.isArray(variable.options) &&
         variable.options.every((option) => typeof option === "string") &&
         typeof variable.multi === "boolean";
}
