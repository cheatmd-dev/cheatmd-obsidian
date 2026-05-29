import { ChildProcess } from "child_process";

// Tracks in-flight subprocesses so plugin unload can stop them. Without this,
// a disabled plugin keeps writing JSON-RPC frames to a removed output panel.
export class ChildTracker {
  private children: Set<ChildProcess> = new Set();

  track(child: ChildProcess): void {
    this.children.add(child);
    const drop = () => this.children.delete(child);
    child.on("close", drop);
    child.on("error", drop);
  }

  terminateAll(): void {
    this.children.forEach((child) => {
      try {
        child.kill();
      } catch {
        // Already exited or detached. Nothing actionable.
      }
    });
    this.children.clear();
  }
}
