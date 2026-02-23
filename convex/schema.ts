import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  games: defineTable({
    gameCode: v.string(), // unique
    status: v.union(v.literal("live"), v.literal("finished")),
    leftTeamName: v.string(),
    rightTeamName: v.string(),
    leftScore: v.number(),
    rightScore: v.number(),
    leftSets: v.number(),
    rightSets: v.number(),
    creatorDeviceId: v.string(),
    editorSecretHash: v.string(),
    pendingPoint: v.union(
      v.object({
        side: v.union(v.literal("left"), v.literal("right")),
        delta: v.union(v.literal(1), v.literal(-1)),
        actorDeviceId: v.string(),
        createdAt: v.number(),
        leftScoreAfter: v.number(),
        rightScoreAfter: v.number(),
      }),
      v.null()
    ),
    nextSeq: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastActivityAt: v.number(),
    autoFinishAt: v.number(), // 12h timeout
    endedAt: v.optional(v.number()),
    endedReason: v.optional(v.union(v.literal("manual"), v.literal("inactivity"))),
    reopenCount: v.number(),
    searchText: v.string(), // normalized names + gameCode
  })
    .index("by_gameCode", ["gameCode"])
    .index("by_status_updatedAt", ["status", "updatedAt"])
    .index("by_status_endedAt", ["status", "endedAt"])
    .index("by_autoFinishAt", ["autoFinishAt"])
    .searchIndex("search_search_text", {
      searchField: "searchText",
    }),

  gameEvents: defineTable({
    gameId: v.id("games"),
    seq: v.number(),
    type: v.union(
      v.literal("point"),
      v.literal("set"),
      v.literal("rename"),
      v.literal("end"),
      v.literal("reopen")
    ),
    side: v.optional(v.union(v.literal("left"), v.literal("right"))),
    delta: v.optional(v.union(v.literal(1), v.literal(-1))),
    leftScoreAfter: v.number(),
    rightScoreAfter: v.number(),
    leftSetsAfter: v.number(),
    rightSetsAfter: v.number(),
    createdAt: v.number(),
    actorDeviceId: v.string(),
  })
    .index("by_game_seq", ["gameId", "seq"])
    .index("by_game_createdAt", ["gameId", "createdAt"]),
});
