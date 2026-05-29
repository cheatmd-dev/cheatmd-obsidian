import { App, Modal, Setting } from "obsidian";
import { PromptVariable } from "../types";

type SubmitCallback = (values: Record<string, string>) => void;
type CancelCallback = () => void;

// Modal prompt for variable values requested by a cheatmd runner. When the
// user confirms, `onSubmit` fires with the collected values. When the user
// dismisses the modal (Esc, click-outside, X) without confirming, `onCancel`
// fires so the runner can send a JSON-RPC abort and reap the child process.
export class VariablePromptModal extends Modal {
  private values: Record<string, string> = {};
  private submitted = false;

  constructor(
    app: App,
    private variables: PromptVariable[],
    private onSubmit: SubmitCallback,
    private onCancel: CancelCallback = () => { /* noop */ },
  ) {
    super(app);
    this.variables = variables || [];
    this.variables.forEach((v) => { this.values[v.name] = defaultValueFor(v); });
  }

  onOpen(): void {
    this.renderHeader();
    this.variables.forEach((v) => this.renderField(v));
    this.renderSubmit();
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.submitted) this.onCancel();
  }

  private renderHeader(): void {
    this.contentEl.createEl("h3", { text: "Variables Required" });
    this.contentEl.createEl("p", {
      text: "Please provide values for the following variables to execute the command:",
      cls: "cheatmd-modal-desc",
    });
  }

  private renderField(v: PromptVariable): void {
    const setting = new Setting(this.contentEl)
      .setName(v.name)
      .setDesc(v.header || `Provide value for $${v.name}`);
    if (hasOptions(v)) {
      this.renderOptionsField(setting, v);
    } else {
      this.renderTextField(setting, v);
    }
  }

  private renderOptionsField(setting: Setting, v: PromptVariable): void {
    setting.addText((text) => {
      text.setPlaceholder(v.placeholder || "Type or select value...");
      text.setValue(defaultValueFor(v));
      text.onChange((value) => { this.values[v.name] = value; });
      // Deferred so the input is in the DOM under its Setting wrapper before
      // we re-parent it into the suggest wrapper.
      setTimeout(() => this.attachSuggestDropdown(text.inputEl, v), 0);
    });
  }

  private renderTextField(setting: Setting, v: PromptVariable): void {
    setting.addText((text) => {
      text.setPlaceholder(v.placeholder || "");
      text.setValue(v.placeholder || "");
      text.onChange((value) => { this.values[v.name] = value; });
    });
  }

  private renderSubmit(): void {
    new Setting(this.contentEl).addButton((btn) =>
      btn
        .setButtonText("Confirm & Execute")
        .setCta()
        .onClick(() => {
          this.submitted = true;
          this.close();
          this.onSubmit(this.values);
        })
    );
  }

  private attachSuggestDropdown(inputEl: HTMLInputElement, v: PromptVariable): void {
    const parent = inputEl.parentElement;
    if (!parent) return;

    const wrapper = wrapInput(inputEl, parent);
    const dropdown = appendDropdown(wrapper);

    const refresh = (filterByValue: boolean) => {
      renderDropdownItems(dropdown, inputEl, v, filterByValue, (opt) => {
        this.values[v.name] = opt;
      });
    };

    inputEl.addEventListener("focus", () => refresh(false));
    inputEl.addEventListener("click", () => refresh(false));
    inputEl.addEventListener("input", () => refresh(true));
    inputEl.addEventListener("blur", () => { dropdown.style.display = "none"; });
  }
}

function hasOptions(v: PromptVariable): boolean {
  return Array.isArray(v.options) && v.options.length > 0;
}

function defaultValueFor(v: PromptVariable): string {
  if (hasOptions(v)) return v.options![0];
  return v.placeholder || "";
}

function wrapInput(inputEl: HTMLInputElement, parent: HTMLElement): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "cheatmd-suggest-wrapper";
  parent.insertBefore(wrapper, inputEl);
  wrapper.appendChild(inputEl);
  return wrapper;
}

function appendDropdown(wrapper: HTMLElement): HTMLElement {
  const dropdown = document.createElement("div");
  dropdown.className = "cheatmd-suggest-dropdown";
  wrapper.appendChild(dropdown);
  return dropdown;
}

function renderDropdownItems(
  dropdown: HTMLElement,
  inputEl: HTMLInputElement,
  v: PromptVariable,
  filterByValue: boolean,
  onPick: (opt: string) => void,
): void {
  dropdown.innerHTML = "";
  const filtered = filterOptions(v.options ?? [], inputEl.value, filterByValue);
  if (filtered.length === 0) {
    dropdown.style.display = "none";
    return;
  }
  filtered.forEach((opt) => {
    dropdown.appendChild(buildDropdownItem(opt, inputEl, dropdown, onPick));
  });
  dropdown.style.display = "block";
}

function filterOptions(options: string[], query: string, filterByValue: boolean): string[] {
  if (!filterByValue || !query) return options;
  const lower = query.toLowerCase();
  return options.filter((opt) => opt.toLowerCase().includes(lower));
}

function buildDropdownItem(
  opt: string,
  inputEl: HTMLInputElement,
  dropdown: HTMLElement,
  onPick: (opt: string) => void,
): HTMLElement {
  const item = document.createElement("div");
  item.className = "cheatmd-suggest-item";
  item.innerText = opt;
  item.addEventListener("mousedown", (e) => {
    e.preventDefault();
    inputEl.value = opt;
    onPick(opt);
    dropdown.style.display = "none";
  });
  return item;
}
