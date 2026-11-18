import type { ExternalCatalog } from "../application/ports/external-catalog.port.ts";
import { FirstMatchCatalog } from "./first-match-catalog.ts";

describe("FirstMatchCatalog", () => {
  const entry = (name: string) => ({ name, unit: "UNIT" as const });
  const catalog = (result: ReturnType<typeof entry> | null | Error): ExternalCatalog => ({
    findByGtin: async () => {
      if (result instanceof Error) throw result;
      return result;
    },
  });

  it("should prefer the first base that knows the code", async () => {
    const both = new FirstMatchCatalog([catalog(entry("Comida")), catalog(entry("Belleza"))]);

    expect(await both.findByGtin("1")).toEqual(entry("Comida"));
  });

  it("should use the second base when the first does not know the code", async () => {
    const both = new FirstMatchCatalog([catalog(null), catalog(entry("Champú"))]);

    expect(await both.findByGtin("1")).toEqual(entry("Champú"));
  });

  it("should use the base that answered when the other one fails", async () => {
    const both = new FirstMatchCatalog([catalog(new Error("caído")), catalog(entry("Champú"))]);

    expect(await both.findByGtin("1")).toEqual(entry("Champú"));
  });

  it("should return null only when every base says it does not know the code", async () => {
    expect(await new FirstMatchCatalog([catalog(null), catalog(null)]).findByGtin("1")).toBeNull();
  });

  it("should fail, not say not found, when a base fails and none knows the code", async () => {
    const both = new FirstMatchCatalog([catalog(null), catalog(new Error("caído"))]);

    await expect(both.findByGtin("1")).rejects.toThrow("caído");
  });

  it("should ask the bases at the same time", async () => {
    let running = 0;
    let maxRunning = 0;
    const slow: ExternalCatalog = {
      findByGtin: async () => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await new Promise((resolve) => setTimeout(resolve, 10));
        running -= 1;
        return null;
      },
    };

    await new FirstMatchCatalog([slow, slow]).findByGtin("1");

    expect(maxRunning).toBe(2);
  });
});
