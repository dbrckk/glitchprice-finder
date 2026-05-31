import { describe, expect, it } from "vitest";
import { safeReadJson, safeRemoveItem, safeWriteJson } from "../storage";

function createMemoryStorage(shouldThrow = false) {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => {
      if (shouldThrow) throw new Error("read failed");
      return values.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (shouldThrow) throw new Error("write failed");
      values.set(key, value);
    },
    removeItem: (key: string) => {
      if (shouldThrow) throw new Error("remove failed");
      values.delete(key);
    },
  };
}

describe("storage", () => {
  it("reads and writes JSON through an injected storage adapter", () => {
    const storage = createMemoryStorage();

    expect(safeWriteJson("key", { ok: true }, storage)).toBe(true);
    expect(safeReadJson("key", { ok: false }, storage)).toEqual({ ok: true });
  });

  it("returns fallbacks and false statuses when storage is unavailable or broken", () => {
    const brokenStorage = createMemoryStorage(true);

    expect(safeReadJson("missing", "fallback", undefined)).toBe("fallback");
    expect(safeReadJson("key", "fallback", brokenStorage)).toBe("fallback");
    expect(safeWriteJson("key", { ok: true }, brokenStorage)).toBe(false);
    expect(safeRemoveItem("key", brokenStorage)).toBe(false);
  });

  it("removes keys safely", () => {
    const storage = createMemoryStorage();

    safeWriteJson("key", [1, 2, 3], storage);
    expect(safeRemoveItem("key", storage)).toBe(true);
    expect(safeReadJson("key", [], storage)).toEqual([]);
  });
});
