import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import { buildSpawnSpec, isFlatpak } from "../process/spawn";

vi.mock("fs", () => ({
  existsSync: vi.fn(),
}));

describe("Spawn Spec Builder", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should detect Flatpak sandboxing correctly if flatpak-info marker exists", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    expect(isFlatpak()).toBe(true);
    expect(fs.existsSync).toHaveBeenCalledWith("/.flatpak-info");
  });

  it("should return normal command spec when not inside flatpak", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const spec = buildSpawnSpec("/usr/local/bin/cheatmd", ["-v"]);
    expect(spec.command).toBe("/usr/local/bin/cheatmd");
    expect(spec.args).toEqual(["-v"]);
  });

  it("should wrap commands inside flatpak-spawn when flatpak sandboxing is active", () => {
    vi.spyOn(fs, "existsSync").mockReturnValue(true);

    const spec = buildSpawnSpec("/usr/local/bin/cheatmd", ["-v"]);
    expect(spec.command).toBe("flatpak-spawn");
    expect(spec.args).toEqual(["--host", "/usr/local/bin/cheatmd", "-v"]);
  });
});
