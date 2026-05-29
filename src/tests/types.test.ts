import { describe, expect, it } from "vitest";
import { isCompletedRpcMessage, isPromptRpcMessage } from "../types";

describe("RPC type guards", () => {
  it("accepts prompt messages only when variables have the declared shape", () => {
    expect(isPromptRpcMessage({
      method: "prompt",
      params: {
        variables: [{
          name: "env",
          header: "Environment",
          placeholder: "dev",
          options: ["dev", "prod"],
          multi: false,
        }],
      },
    })).toBe(true);

    expect(isPromptRpcMessage({
      method: "prompt",
      params: { variables: [123, {}] },
    })).toBe(false);

    expect(isPromptRpcMessage({
      method: "prompt",
      params: {
        variables: [{
          name: "env",
          header: "Environment",
          placeholder: "dev",
          options: ["dev", 42],
          multi: false,
        }],
      },
    })).toBe(false);
  });

  it("accepts completed messages only for known statuses", () => {
    const base = {
      command: "echo ok",
      stdout: "ok",
      stderr: "",
      exit_code: 0,
    };

    expect(isCompletedRpcMessage({
      method: "completed",
      params: { ...base, status: "success" },
    })).toBe(true);

    expect(isCompletedRpcMessage({
      method: "completed",
      params: { ...base, status: "pending" },
    })).toBe(false);
  });
});
