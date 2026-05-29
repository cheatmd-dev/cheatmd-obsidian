import { App } from "obsidian";
import * as cp from "child_process";

import { DIAGNOSTIC_REGEX, LINTER_DEBOUNCE_MS } from "../constants";
import { buildSpawnSpec } from "../process/spawn";
import { ChildTracker } from "../process/children";
import { getVaultPath } from "../process/vault";
import { StatusBar } from "../ui/status-bar";

export interface LinterDeps {
  app: App;
  statusBar: StatusBar;
  children: ChildTracker;
  executablePath(): string;
  strict(): boolean;
}

// Debounced cheatmd --lint runner. Uses cp.spawn so vault paths with shell
// metacharacters can't break out into a shell.
export class Linter {
  private timeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private deps: LinterDeps) {}

  trigger(): void {
    if (this.timeout) clearTimeout(this.timeout);
    this.timeout = setTimeout(() => this.run(), LINTER_DEBOUNCE_MS);
  }

  dispose(): void {
    if (!this.timeout) return;
    clearTimeout(this.timeout);
    this.timeout = null;
  }

  private run(): void {
    const vaultPath = getVaultPath(this.deps.app);
    if (!vaultPath) return;

    const spec = buildSpawnSpec(this.deps.executablePath(), this.buildArgs(vaultPath));
    const child = this.spawn(spec, vaultPath);
    if (child) this.wireChild(child);
  }

  private buildArgs(vaultPath: string): string[] {
    const args = ["--lint"];
    if (this.deps.strict()) args.push("--strict");
    args.push(vaultPath);
    return args;
  }

  private spawn(spec: { command: string; args: string[] }, vaultPath: string): cp.ChildProcess | null {
    try {
      const child = cp.spawn(spec.command, spec.args, { cwd: vaultPath });
      this.deps.children.track(child);
      return child;
    } catch {
      this.deps.statusBar.set("missing", 0);
      return null;
    }
  }

  private wireChild(child: cp.ChildProcess): void {
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (data) => { stdout += data.toString(); });
    child.stderr?.on("data", (data) => { stderr += data.toString(); });

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") this.deps.statusBar.set("missing", 0);
    });

    child.on("close", () => this.report(`${stdout}\n${stderr}`));
  }

  private report(output: string): void {
    const findings = countFindings(output);
    this.deps.statusBar.set(findings > 0 ? "warnings" : "clean", findings);
  }
}

function countFindings(output: string): number {
  return output.split("\n").filter((line) => DIAGNOSTIC_REGEX.test(line)).length;
}
