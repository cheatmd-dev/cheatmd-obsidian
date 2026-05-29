import { MarkdownPostProcessorContext } from "obsidian";
import { CHEAT_OPEN, FENCE_TITLE_DOUBLE, FENCE_TITLE_SINGLE } from "../constants";
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
  const headingLine = scanHeadingLine(lines, lineStart);
  if (headingLine === -1) return null;

  const heading = lines[headingLine].replace(/^#+\s*/, "").trim();
  if (!heading) return null;

  if (!hasCheatBlockInSection(lines, headingLine)) return null;

  return {
    heading,
    fenceTitle: parseFenceTitle(lines[lineStart] || ""),
    lineStart,
  };
}

function scanHeadingLine(lines: string[], from: number): number {
  for (let i = from; i >= 0; i--) {
    const text = (lines[i] || "").trim();
    if (text.startsWith("#")) return i;
  }
  return -1;
}

// Single pass from the heading down: bail at the next heading, return true
// on the first `<!-- cheat` opener. Uses the canonical CHEAT_OPEN regex so
// this stays in sync with the rest of the plugin's cheat-block detection.
function hasCheatBlockInSection(lines: string[], headingLine: number): boolean {
  for (let i = headingLine + 1; i < lines.length; i++) {
    const text = lines[i] || "";
    if (text.trim().startsWith("#")) return false;
    if (CHEAT_OPEN.test(text)) return true;
  }
  return false;
}

function parseFenceTitle(openingLine: string): string {
  const line = openingLine.trim();
  const match = FENCE_TITLE_DOUBLE.exec(line) || FENCE_TITLE_SINGLE.exec(line);
  return match ? match[1].trim() : "";
}
