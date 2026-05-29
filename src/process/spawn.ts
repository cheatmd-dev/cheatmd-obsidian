import * as fs from "fs";

export interface SpawnSpec {
  command: string;
  args: string[];
}

// Obsidian Flatpak installs are sandboxed; cheatmd must be reached on the host.
export function isFlatpak(): boolean {
  return fs.existsSync("/.flatpak-info");
}

// Resolve (command, args) once, transparently wrapping with flatpak-spawn when
// the host is sandboxed so call sites stay identical. If the resolved binary
// isn't on PATH, set an absolute path via the plugin's `executablePath` setting.
export function buildSpawnSpec(executablePath: string, args: string[]): SpawnSpec {
  if (isFlatpak()) {
    return { command: "flatpak-spawn", args: ["--host", executablePath, ...args] };
  }
  return { command: executablePath, args };
}
