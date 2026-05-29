import { RunCompletedParams } from "../types";

export function renderRunResult(params: RunCompletedParams): DocumentFragment {
  const fragment = document.createDocumentFragment();

  if (params.status === "success") {
    const okDiv = document.createElement("div");
    okDiv.className = "cheatmd-result-ok";
    okDiv.textContent = `✓ Complete (Exit Code ${params.exit_code})`;
    fragment.appendChild(okDiv);

    fragment.appendChild(renderCommand(params.command));
    fragment.appendChild(renderStdout(params.stdout));

    const stderrNode = renderStderr(params.stderr);
    if (stderrNode) {
      fragment.appendChild(stderrNode);
    }
  } else {
    const failDiv = document.createElement("div");
    failDiv.className = "cheatmd-result-fail";
    failDiv.textContent = `✗ Failed (Exit Code ${params.exit_code})`;
    fragment.appendChild(failDiv);

    fragment.appendChild(renderCommand(params.command));

    const errText = params.error || params.stderr || "Unknown error occurred";
    const errPre = document.createElement("pre");
    errPre.className = "cheatmd-output-block cheatmd-output-stderr";
    errPre.textContent = errText;
    fragment.appendChild(errPre);
  }

  return fragment;
}

function renderCommand(command: string): HTMLElement {
  const cmdDiv = document.createElement("div");
  cmdDiv.className = "cheatmd-result-cmd";
  cmdDiv.textContent = "Command: ";

  const codeEl = document.createElement("code");
  codeEl.className = "cheatmd-inline-code";
  codeEl.textContent = command;

  cmdDiv.appendChild(codeEl);
  return cmdDiv;
}

function renderStdout(stdout: string): HTMLElement {
  if (!hasContent(stdout)) {
    const emptyDiv = document.createElement("div");
    emptyDiv.className = "cheatmd-output-empty";
    emptyDiv.textContent = "Command completed with no standard output.";
    return emptyDiv;
  }
  const pre = document.createElement("pre");
  pre.className = "cheatmd-output-block cheatmd-output-stdout";
  pre.textContent = stdout;
  return pre;
}

function renderStderr(stderr: string): HTMLElement | null {
  if (!hasContent(stderr)) return null;
  const pre = document.createElement("pre");
  pre.className = "cheatmd-output-block cheatmd-output-stderr";
  pre.textContent = stderr;
  return pre;
}

function hasContent(s: string | undefined): boolean {
  return Boolean(s) && s!.trim() !== "";
}
