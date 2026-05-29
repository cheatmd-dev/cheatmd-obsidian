// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderRunResult } from "../output/renderer";
import { RunCompletedParams } from "../types";

describe("Renderer", () => {
  it("should render success results programmatically without innerHTML bugs", () => {
    const params: RunCompletedParams = {
      status: "success",
      command: "echo 'hello'",
      stdout: "hello world",
      stderr: "",
      exit_code: 0
    };

    const fragment = renderRunResult(params);
    const container = document.createElement("div");
    container.appendChild(fragment);

    const okDiv = container.querySelector(".cheatmd-result-ok");
    expect(okDiv).not.toBeNull();
    expect(okDiv?.textContent).toContain("Complete (Exit Code 0)");

    const cmdCode = container.querySelector(".cheatmd-inline-code");
    expect(cmdCode?.textContent).toBe("echo 'hello'");

    const stdoutPre = container.querySelector(".cheatmd-output-stdout");
    expect(stdoutPre?.textContent).toBe("hello world");
    expect(container.querySelector(".cheatmd-output-stderr")).toBeNull();
  });

  it("should render failure results with error logs", () => {
    const params: RunCompletedParams = {
      status: "failure",
      command: "false",
      stdout: "",
      stderr: "exit code 1",
      error: "Command timed out",
      exit_code: 1
    };

    const fragment = renderRunResult(params);
    const container = document.createElement("div");
    container.appendChild(fragment);

    const failDiv = container.querySelector(".cheatmd-result-fail");
    expect(failDiv).not.toBeNull();
    expect(failDiv?.textContent).toContain("Failed (Exit Code 1)");

    const errBlock = container.querySelector(".cheatmd-output-stderr");
    expect(errBlock?.textContent).toBe("Command timed out");
  });
});
