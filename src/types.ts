export interface PromptVariable {
  name: string;
  header: string;
  placeholder: string;
  // Preset values for a picker. Absent or empty means free-text input.
  options?: string[];
  multi: boolean;
}

// Message sent by the cheatmd runner on the JSON-RPC `completed` notification.
// Per the headless protocol, status is exactly one of:
//   "success" — command ran and finished without error.
//   "error"   — anything went wrong; `error` holds the human-readable reason
//               and `exit_code` may be -1 when no process actually ran.
export interface RunCompletedParams {
  status: "success" | "error";
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
  return (params.status === "success" || params.status === "error") &&
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
  // `options` is optional. Accept missing/null (runner may emit either) or a
  // homogeneous string array; reject anything else.
  const hasValidOptions =
    variable.options == null ||
    (Array.isArray(variable.options) && variable.options.every((opt) => typeof opt === "string"));

  return typeof variable.name === "string" &&
         typeof variable.header === "string" &&
         typeof variable.placeholder === "string" &&
         hasValidOptions &&
         typeof variable.multi === "boolean";
}
