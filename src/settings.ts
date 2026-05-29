import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

export interface CheatMDSettings {
  executablePath: string;
  strict: boolean;
}

export const DEFAULT_SETTINGS: CheatMDSettings = {
  executablePath: "cheatmd",
  strict: false,
};

// Indirection so the tab always reads/writes against the plugin's live
// settings object even if it gets reassigned (e.g. on reload).
export interface SettingsHost {
  getSettings(): CheatMDSettings;
  saveSettings(): Promise<void>;
  onSettingsChanged(): void;
}

export class CheatMDSettingTab extends PluginSettingTab {
  constructor(app: App, plugin: Plugin, private host: SettingsHost) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.empty();
    this.addExecutablePathSetting();
    this.addStrictSetting();
  }

  private addExecutablePathSetting(): void {
    new Setting(this.containerEl)
      .setName("Executable path")
      .setDesc("Path to the cheatmd CLI binary. Use an absolute path or a name resolvable via $PATH.")
      .addText((text) =>
        text
          .setPlaceholder("cheatmd")
          .setValue(this.host.getSettings().executablePath)
          .onChange(async (value) => {
            this.host.getSettings().executablePath = value.trim() || "cheatmd";
            await this.host.saveSettings();
          })
      );
  }

  private addStrictSetting(): void {
    new Setting(this.containerEl)
      .setName("Strict linting")
      .setDesc("Pass --strict to the background linter. Warnings are reported as errors.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.host.getSettings().strict)
          .onChange(async (value) => {
            this.host.getSettings().strict = value;
            await this.host.saveSettings();
            this.host.onSettingsChanged();
          })
      );
  }
}
