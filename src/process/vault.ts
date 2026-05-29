import { App, FileSystemAdapter } from "obsidian";

// Mobile adapters don't expose basePath. Plugin is desktop-only, but the
// instanceof check keeps the cast honest and tolerates future mobile support.
export function getVaultPath(app: App): string | null {
  const adapter = app.vault.adapter;
  if (adapter instanceof FileSystemAdapter) {
    return adapter.getBasePath();
  }
  return null;
}
