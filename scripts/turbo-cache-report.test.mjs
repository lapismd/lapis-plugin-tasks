import { describe, expect, it } from "vitest";

import { summarizeTurboCache } from "./report-turbo-cache.mjs";

describe("Turbo cache report", () => {
  it("summarizes local and remote cache outcomes", () => {
    expect(
      summarizeTurboCache({
        tasks: [
          { cache: { status: "HIT", source: "REMOTE" } },
          { cache: { status: "HIT", source: "LOCAL" } },
          { cache: { status: "MISS" } },
        ],
      }),
    ).toEqual({ attempted: 3, executed: 1, localHits: 1, remoteHits: 1 });
  });
});
