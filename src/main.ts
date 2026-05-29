import { Plugin, TFile } from "obsidian";

import { CachedRun, BlockMeta } from "./types";
import { CheatMDSettings, CheatMDSettingTab, DEFAULT_SETTINGS } from "./settings";
import { ChildTracker } from "./process/children";
import { Linter } from "./linter/linter";
import { CheatRunner } from "./runner/runner";
import { PlayButtonInjector } from "./ui/play-button";
import { CheatMDSuggest } from "./ui/suggest";
import { StatusBar } from "./ui/status-bar";

export default class CheatMDPlugin extends Plugin {
  settings: CheatMDSettings = DEFAULT_SETTINGS;
  private cache: Map<string, CachedRun> = new Map();
  private children: ChildTracker = new ChildTracker();
  private statusBar!: StatusBar;
  private linter!: Linter;
  private runner!: CheatRunner;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.statusBar = new StatusBar(this);
    this.linter = this.buildLinter();
    this.runner = this.buildRunner();

    this.addSettingTab(new CheatMDSettingTab(this.app, this, {
      getSettings: () => this.settings,
      saveSettings: () => this.saveSettings(),
      onSettingsChanged: () => this.linter.trigger(),
    }));

    this.registerPlayButtons();
    this.registerVaultLinting();
    this.registerEditorSuggest(new CheatMDSuggest(this.app));

    this.app.workspace.onLayoutReady(() => {
      this.linter.trigger();
    });
  }

  onunload(): void {
    this.linter?.dispose();
    this.children.terminateAll();
    this.cache.clear();
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  private buildLinter(): Linter {
    return new Linter({
      app: this.app,
      statusBar: this.statusBar,
      children: this.children,
      executablePath: () => this.settings.executablePath,
      strict: () => this.settings.strict,
    });
  }

  private buildRunner(): CheatRunner {
    return new CheatRunner({
      app: this.app,
      cache: this.cache,
      children: this.children,
      executablePath: () => this.settings.executablePath,
    });
  }

  private registerPlayButtons(): void {
    const injector = new PlayButtonInjector(
      this.cache,
      buildRunKey,
      (preEl, meta, key) => this.runner.run(preEl, meta, key),
    );
    this.registerMarkdownPostProcessor((el, ctx) => injector.process(el as HTMLElement, ctx));
  }

  private registerVaultLinting(): void {
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (file instanceof TFile && file.extension === "md") this.linter.trigger();
      })
    );
  }
}

// Including lineStart ensures sibling code blocks under the same heading
// (e.g. variants with no title attribute) don't collide on cache lookups.
function buildRunKey(sourcePath: string, meta: BlockMeta): string {
  return `${sourcePath}::${meta.heading}::${meta.fenceTitle}::${meta.lineStart}`;
}
