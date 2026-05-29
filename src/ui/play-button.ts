import { MarkdownPostProcessorContext } from "obsidian";
import { FENCE_TITLE_DOUBLE, FENCE_TITLE_SINGLE } from "../constants";
import { BlockMeta, CachedRun } from "../types";
import { createPanel } from "../output/panel";
import { renderRunResult } from "../output/renderer";

export type RunHandler = (preEl: HTMLElement, meta: BlockMeta, cacheKey: string) => void;
export type KeyBuilder = (sourcePath: string, meta: BlockMeta) => string;

// Decorates rendered code blocks with a play button and rehydrates cached
// output panel below the block. Survives view re-renders (file switch, edit
// reflow) by keying off the markdown source location instead of DOM identity.
export class PlayButtonInjector {
  constructor(
    private cache: Map<string, CachedRun>,
    private runKey: KeyBuilder,
    private onRun: RunHandler,
  ) {}

  process(element: HTMLElement, context: MarkdownPostProcessorContext): void {
    const blocks = element.querySelectorAll("pre > code") as NodeListOf<HTMLElement>;
    blocks.forEach((codeEl) => this.processBlock(codeEl, context));
  }

  private processBlock(codeEl: HTMLElement, context: MarkdownPostProcessorContext): void {
    const preEl = codeEl.parentElement;
    if (!preEl) return;

    const sectionInfo = context.getSectionInfo(codeEl);
    if (!sectionInfo) return;

    const meta = extractBlockMeta(sectionInfo.text.split("\n"), sectionInfo.lineStart);
    if (!meta) return;

    const cacheKey = this.runKey(context.sourcePath, meta);
    this.injectButton(preEl, meta, cacheKey);
    this.rehydrate(preEl, cacheKey);
  }

  private injectButton(preEl: HTMLElement, meta: BlockMeta, cacheKey: string): void {
    const button = document.createElement("div");
    button.className = "cheatmd-play-button";
    button.innerText = "▶ Run with CheatMD";
    button.addEventListener("click", () => this.onRun(preEl, meta, cacheKey));
    preEl.insertBefore(button, preEl.firstChild);
  }

  private rehydrate(preEl: HTMLElement, cacheKey: string): void {
    if (hasPanelSibling(preEl)) return;
    const cached = this.cache.get(cacheKey);
    if (!cached) return;

    const panel = createPanel(cacheKey, this.cache);
    panel.setStatusNode(renderRunResult(cached.params));
    preEl.parentNode?.insertBefore(panel.el, preEl.nextSibling);
  }
}

function hasPanelSibling(preEl: HTMLElement): boolean {
  const next = preEl.nextElementSibling;
  return Boolean(next && next.classList.contains("cheatmd-output-container"));
}

function extractBlockMeta(lines: string[], lineStart: number): BlockMeta | null {
  const heading = scanHeading(lines, lineStart);
  if (!heading) return null;
  return {
    heading,
    fenceTitle: parseFenceTitle(lines[lineStart] || ""),
    lineStart,
  };
}

function scanHeading(lines: string[], from: number): string {
  for (let i = from; i >= 0; i--) {
    const text = (lines[i] || "").trim();
    if (text.startsWith("#")) return text.replace(/^#+\s*/, "").trim();
  }
  return "";
}

function parseFenceTitle(openingLine: string): string {
  const line = openingLine.trim();
  const match = FENCE_TITLE_DOUBLE.exec(line) || FENCE_TITLE_SINGLE.exec(line);
  return match ? match[1].trim() : "";
}
