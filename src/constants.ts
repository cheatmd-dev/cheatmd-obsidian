// GCC-style linter diagnostic: path:line:col: severity: message
export const DIAGNOSTIC_REGEX = /^(.*?):(\d+):(\d+):\s+(warning|error):\s+(.*)$/;

// CheatMD DSL fragments used while scanning sheets for variables.
export const CHEAT_OPEN = /<!--\s*cheat\b/;
export const VAR_DEF = /^\s*var\s+([a-zA-Z_][a-zA-Z0-9_]*)/;

// `title:"..."` / `title:'...'` attribute on a fence opening line.
export const FENCE_TITLE_DOUBLE = /title:\s*"([^"]*)"/;
export const FENCE_TITLE_SINGLE = /title:\s*'([^']*)'/;

// Suggest-trigger: `$name` or `<name` at end of line prefix.
export const SUGGEST_TRIGGER = /(\$|<)([a-zA-Z0-9_]*)$/;

export const LINTER_DEBOUNCE_MS = 500;
export const COPY_FLASH_MS = 1200;
