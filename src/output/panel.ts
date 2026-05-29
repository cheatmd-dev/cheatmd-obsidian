import { Notice } from "obsidian";
import { COPY_FLASH_MS } from "../constants";
import { CachedRun } from "../types";

export interface PanelHandle {
  el: HTMLElement;
  setStatusText(text: string): void;
  setStatusNode(node: Node): void;
}

const ICON_COPY = "⧉";
const ICON_COPIED = "✓";
const ICON_CLOSE = "✕";

export function createPanel(cacheKey: string, cache: Map<string, CachedRun>): PanelHandle {
  const el = document.createElement("div");
  el.className = "cheatmd-output-container";
  el.dataset.cheatmdKey = cacheKey;

  const actionsEl = document.createElement("div");
  actionsEl.className = "cheatmd-output-actions";

  const copyBtn = document.createElement("button");
  copyBtn.className = "cheatmd-copy-btn";
  copyBtn.title = "Copy output";
  setButtonContent(copyBtn, ICON_COPY, "Copy");

  const closeBtn = document.createElement("button");
  closeBtn.className = "cheatmd-close-btn";
  closeBtn.title = "Close";
  setButtonContent(closeBtn, ICON_CLOSE, "Close");

  actionsEl.appendChild(copyBtn);
  actionsEl.appendChild(closeBtn);

  const statusEl = document.createElement("div");
  statusEl.className = "cheatmd-status";

  el.appendChild(actionsEl);
  el.appendChild(statusEl);

  wireCloseButton(el, cacheKey, cache);
  wireCopyButton(el, cacheKey, cache);

  return buildHandle(el);
}

// Adopt an existing panel element (re-run on an open container)
export function adoptPanel(el: HTMLElement): PanelHandle {
  return buildHandle(el);
}

function buildHandle(el: HTMLElement): PanelHandle {
  const statusEl = el.querySelector(".cheatmd-status") as HTMLElement;
  return {
    el,
    setStatusText: (text) => {
      statusEl.textContent = text;
    },
    setStatusNode: (node) => {
      statusEl.textContent = "";
      statusEl.appendChild(node);
    },
  };
}

function wireCloseButton(el: HTMLElement, cacheKey: string, cache: Map<string, CachedRun>): void {
  const btn = el.querySelector(".cheatmd-close-btn") as HTMLElement;
  btn.addEventListener("click", () => {
    cache.delete(cacheKey);
    el.remove();
  });
}

function wireCopyButton(el: HTMLElement, cacheKey: string, cache: Map<string, CachedRun>): void {
  const btn = el.querySelector(".cheatmd-copy-btn") as HTMLButtonElement;
  btn.addEventListener("click", () => copyToClipboard(btn, cache.get(cacheKey)));
}

async function copyToClipboard(btn: HTMLButtonElement, cached: CachedRun | undefined): Promise<void> {
  const text = pickCopyText(cached);
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    flashCopied(btn);
  } catch {
    new Notice("CheatMD: clipboard write failed");
  }
}

function pickCopyText(cached: CachedRun | undefined): string {
  if (!cached) return "";
  return cached.params.stdout || cached.params.stderr || cached.params.error || "";
}

function flashCopied(btn: HTMLButtonElement): void {
  setButtonContent(btn, ICON_COPIED, "Copied");
  setTimeout(() => { setButtonContent(btn, ICON_COPY, "Copy"); }, COPY_FLASH_MS);
}

function setButtonContent(btn: HTMLButtonElement, icon: string, label: string): void {
  btn.textContent = "";

  const iconEl = document.createElement("span");
  iconEl.className = "cheatmd-btn-icon";
  iconEl.textContent = icon;

  btn.appendChild(iconEl);
  btn.appendChild(document.createTextNode(label));
}
