# CheatMD for Obsidian

A lightweight Obsidian plugin providing editor and preview support for **[CheatMD](https://github.com/gubarz/cheatmd)** sheets. Write executable Markdown cheatsheets directly inside your vault.

## Features

- **Inline Play Buttons**: Renders a `▶ Run with CheatMD` button above Markdown code fences under headings in Reading mode and Live Preview mode.
- **Inline Execution Results**: Runs `cheatmd --headless` in the background and renders output below the clicked code block.
- **Status Bar Diagnostic Linter**: Runs `cheatmd --lint` in the background on vault changes and updates a status bar indicator (`✓ CheatMD: Clean`, `⚠ CheatMD: N Findings`, or `✗ CheatMD: CLI Not Found`).
- **Variable Autocomplete**: Suggests variables such as `$name` and `<name>` when you type `$` or `<` inside code blocks.

## Requirements

CheatMD for Obsidian requires the `cheatmd` command-line tool. Install CheatMD from the official releases or follow the setup instructions at either location:

- Website: https://cheatmd.dev
- GitHub: https://github.com/gubarz/cheatmd

After installing, make sure `cheatmd` is available in your system path. You can also set an absolute path in the plugin settings.

## Disclosures

CheatMD for Obsidian starts the local `cheatmd` binary for linting and inline execution. It passes the current vault path to that local command. The plugin does not send telemetry, show ads, require an account, or make network requests.

## Flatpak sandboxing on Linux

> [!WARNING]
> If you installed Obsidian via Flatpak, its sandbox cannot launch host binaries unless explicitly allowed.

CheatMD uses `flatpak-spawn --host` so the plugin can run the `cheatmd` binary installed on your host system. To allow that, grant Obsidian access to Flatpak's host-spawn D-Bus interface:

```bash
flatpak override --user --talk-name=org.freedesktop.Flatpak md.obsidian.Obsidian
```

This permission lets sandboxed Obsidian start local commands as your user. If you do not want to grant it, use a native non-Flatpak Obsidian install or leave inline execution unavailable.

## Install manually

1. Download `main.js`, `manifest.json`, and `styles.css` from the plugin release.
2. Inside your Obsidian vault, navigate to `.obsidian/plugins/` (create the `plugins` folder if it doesn't exist).
3. Create a new subfolder named `cheatmd`.
4. Copy `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/cheatmd/`.
5. Open Obsidian.
6. Navigate to **Settings** > **Community plugins**.
7. Select **Reload** to refresh the list, locate **CheatMD**, and enable it.
