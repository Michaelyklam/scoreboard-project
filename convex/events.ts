import { v } from "convex/values";
import { query } from "./_generated/server";

export const listTimeline = query({
    args: {
        gameId: v.id("games"),
        limit: v.number(),
        cursor: v.optional(v.string()),
        includeCurrentPending: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const game = await ctx.db.get(args.gameId);
        if (!game) throw new Error("Game not found");

        const events = await ctx.db
            .query("gameEvents")
            .withIndex("by_game_seq", (q) => q.eq("gameId", args.gameId))
            .order("desc")
            .paginate({ cursor: args.cursor ?? null, numItems: args.limit });

        let page = [...events.page];

        if (!args.cursor && args.includeCurrentPending && game.pendingPoint) {
            page.unshift({
                _id: "pending" as any,
                _creationTime: game.pendingPoint.createdAt,
                gameId: game._id,
                seq: game.nextSeq,
                type: "point",
                side: game.pendingPoint.side,
                delta: game.pendingPoint.delta,
                leftScoreAfter: game.pendingPoint.leftScoreAfter,
                rightScoreAfter: game.pendingPoint.rightScoreAfter,
                leftSetsAfter: game.leftSets,
                rightSetsAfter: game.rightSets,
                createdAt: game.pendingPoint.createdAt,
                actorDeviceId: game.pendingPoint.actorDeviceId,
            });
        }

        return { ...events, page };
    },
});
