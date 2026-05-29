import { App, Notice } from "obsidian";
import * as cp from "child_process";
import * as readline from "readline";

import { BlockMeta, CachedRun, PromptVariable, RunCompletedParams, RpcMessage, isPromptRpcMessage, isCompletedRpcMessage } from "../types";
import { buildSpawnSpec } from "../process/spawn";
import { ChildTracker } from "../process/children";
import { getVaultPath } from "../process/vault";
import { adoptPanel, createPanel, PanelHandle } from "../output/panel";
import { renderRunResult } from "../output/renderer";
import { VariablePromptModal } from "../ui/variable-modal";
import { logger } from "../util/logger";

export interface RunnerDeps {
  app: App;
  cache: Map<string, CachedRun>;
  children: ChildTracker;
  executablePath(): string;
}

// Orchestrates a single play-button click: starts the headless cheatmd runner,
// drives the JSON-RPC conversation, and pipes results into an inline panel.
export class CheatRunner {
  constructor(private deps: RunnerDeps) {}

  run(preEl: HTMLElement, meta: BlockMeta, cacheKey: string): void {
    const vaultPath = getVaultPath(this.deps.app);
    if (!vaultPath) {
      new Notice("CheatMD: Failed to resolve vault base path.");
      return;
    }
    const query = buildQuery(meta);
    const panel = this.mountPanel(preEl, cacheKey);
    panel.setStatusText(`Executing: ${query} - spawning background process...`);
    new Notice(`CheatMD: Executing "${query}" in background...`);
    this.spawn(query, vaultPath, cacheKey, panel);
  }

  private mountPanel(preEl: HTMLElement, cacheKey: string): PanelHandle {
    const existing = preEl.nextElementSibling;
    if (existing instanceof HTMLElement && existing.classList.contains("cheatmd-output-container")) {
      return adoptPanel(existing);
    }
    const panel = createPanel(cacheKey, this.deps.cache);
    preEl.parentNode?.insertBefore(panel.el, preEl.nextSibling);
    return panel;
  }

  private spawn(query: string, vaultPath: string, cacheKey: string, panel: PanelHandle): void {
    const spec = buildSpawnSpec(this.deps.executablePath(), [
      "--headless", "-e", "-q", query, vaultPath,
    ]);
    let child: cp.ChildProcess;
    try {
      child = cp.spawn(spec.command, spec.args, { cwd: vaultPath });
    } catch (err: unknown) {
      const message = errorMessage(err);
      logger.error(`CheatMD error launching headless runner: ${message}`, err);
      new Notice(`CheatMD error launching headless runner: ${message}`);
      panel.setStatusNode(processErrorNode(message));
      return;
    }
    this.deps.children.track(child);
    this.wireChild(child, query, cacheKey, panel);
  }

  private wireChild(child: cp.ChildProcess, query: string, cacheKey: string, panel: PanelHandle): void {
    child.on("error", (err) => {
      logger.error(`Subprocess error signal: ${err.message}`, err);
      new Notice(`CheatMD failed to start: ${err.message}`);
      panel.setStatusNode(processErrorNode(err.message));
    });
    child.stderr?.on("data", (data) => logger.warn(`cheatmd stderr: ${data}`));

    readline
      .createInterface({ input: child.stdout!, terminal: false })
      .on("line", (line) => this.handleLine(line, child, query, cacheKey, panel));
  }

  private handleLine(
    line: string,
    child: cp.ChildProcess,
    query: string,
    cacheKey: string,
    panel: PanelHandle,
  ): void {
    let req: RpcMessage;
    try {
      req = JSON.parse(line) as RpcMessage;
    } catch (err: unknown) {
      logger.error(`Failed to parse JSON-RPC line from process output: ${line}`, err);
      panel.setStatusText(`RPC Syntax Error: ${errorMessage(err)}`);
      return;
    }

    if (isPromptRpcMessage(req)) {
      this.handlePrompt(req, child, panel);
    } else if (isCompletedRpcMessage(req)) {
      this.handleCompleted(req.params, query, cacheKey, panel);
    } else {
      logger.warn(`Unrecognized or invalid JSON-RPC message received: ${line}`);
    }
  }

  private handlePrompt(
    req: RpcMessage & { params: { variables: PromptVariable[] } },
    child: cp.ChildProcess,
    panel: PanelHandle,
  ): void {
    panel.setStatusNode(createAccentNode("Prompting variables...", "cheatmd-accent-bold"));
    const modal = new VariablePromptModal(this.deps.app, req.params.variables, (values) => {
      panel.setStatusNode(createAccentNode("Submitting variables...", "cheatmd-muted-italic"));
      child.stdin?.write(rpcResponse(req.id, values) + "\n");
    });
    modal.open();
  }

  private handleCompleted(
    params: RunCompletedParams,
    query: string,
    cacheKey: string,
    panel: PanelHandle,
  ): void {
    const success = params.status === "success";
    new Notice(success
      ? "CheatMD: Execution completed successfully!"
      : "CheatMD Execution Failed!");
    this.deps.cache.set(cacheKey, { query, params });
    panel.setStatusNode(renderRunResult(params));
  }
}

function buildQuery(meta: BlockMeta): string {
  return meta.fenceTitle ? `${meta.heading} ${meta.fenceTitle}` : meta.heading;
}

function rpcResponse(id: unknown, values: Record<string, string>): string {
  return JSON.stringify({ jsonrpc: "2.0", result: { values }, id });
}

function processErrorNode(message: string): HTMLElement {
  const container = document.createElement("span");

  const label = document.createElement("span");
  label.className = "cheatmd-error-label";
  label.textContent = "Process error: ";

  const msgSpan = document.createElement("span");
  msgSpan.textContent = message;

  container.appendChild(label);
  container.appendChild(msgSpan);
  return container;
}

function createAccentNode(text: string, className: string): HTMLElement {
  const span = document.createElement("span");
  span.className = className;
  span.textContent = text;
  return span;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
