import { Plugin } from "obsidian";
import { StatusBarState } from "../types";

interface StatusView {
  text: string;
  color: string;
}

export class StatusBar {
  private el: HTMLElement;

  constructor(plugin: Plugin) {
    this.el = plugin.addStatusBarItem();
    this.set("clean", 0);
  }

  set(state: StatusBarState, count: number): void {
    const view = viewFor(state, count);
    this.el.innerText = view.text;
    this.el.style.color = view.color;
  }
}

function viewFor(state: StatusBarState, count: number): StatusView {
  switch (state) {
    case "clean":
      return { text: "✓ CheatMD: Clean", color: "var(--text-success)" };
    case "warnings":
      return { text: `⚠ CheatMD: ${count} Findings`, color: "var(--text-warning)" };
    case "missing":
      return { text: "✗ CheatMD: CLI Not Found", color: "var(--text-error)" };
  }
}
