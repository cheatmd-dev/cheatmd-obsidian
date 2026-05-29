import {
  App,
  Editor,
  EditorPosition,
  EditorSuggest,
  EditorSuggestContext,
  EditorSuggestTriggerInfo,
  TFile,
} from "obsidian";
import { CHEAT_OPEN, SUGGEST_TRIGGER, VAR_DEF } from "../constants";

// Autocompletes locally-declared cheat variables when the user types `$name`
// or `<name` inside a sheet.
export class CheatMDSuggest extends EditorSuggest<string> {
  constructor(app: App) {
    super(app);
  }

  onTrigger(cursor: EditorPosition, editor: Editor, _file: TFile): EditorSuggestTriggerInfo | null {
    const prefix = editor.getLine(cursor.line).substring(0, cursor.ch);
    const match = SUGGEST_TRIGGER.exec(prefix);
    if (!match) return null;
    return {
      start: { line: cursor.line, ch: cursor.ch - match[0].length },
      end: cursor,
      query: match[2],
    };
  }

  getSuggestions(context: EditorSuggestContext): string[] {
    return collectLocalVars(context.editor.getValue(), context.query.toLowerCase());
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.innerText = `$${value} (CheatMD Var)`;
  }

  selectSuggestion(value: string, _evt: MouseEvent | KeyboardEvent): void {
    if (!this.context) return;
    const { start, end, editor } = this.context;
    const triggerChar = editor.getLine(start.line).charAt(start.ch);
    const insertText = triggerChar === "<" ? `${value}>` : value;
    editor.replaceRange(insertText, { line: start.line, ch: start.ch + 1 }, end);
  }
}

function collectLocalVars(content: string, query: string): string[] {
  const suggestions: string[] = [];
  let inCheatComment = false;
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (CHEAT_OPEN.test(trimmed)) inCheatComment = true;
    if (inCheatComment) maybeCollect(trimmed, query, suggestions);
    if (trimmed.includes("-->")) inCheatComment = false;
  }
  return suggestions;
}

function maybeCollect(line: string, query: string, out: string[]): void {
  const varName = VAR_DEF.exec(line)?.[1];
  if (!varName) return;
  if (!varName.toLowerCase().includes(query)) return;
  if (out.includes(varName)) return;
  out.push(varName);
}
