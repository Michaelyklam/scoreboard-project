import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

export const autoFinishJob = internalMutation({
    args: {},
    handler: async (ctx) => {
        const now = Date.now();
        const staleGames = await ctx.db
            .query("games")
            .withIndex("by_autoFinishAt", (q) => q.lt("autoFinishAt", now))
            .filter((q) => q.eq(q.field("status"), "live"))
            .take(100);

        for (const game of staleGames) {
            // Flush pending point
            let nextSeq = game.nextSeq;
            if (game.pendingPoint) {
                await ctx.db.insert("gameEvents", {
                    gameId: game._id,
                    seq: nextSeq++,
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

            await ctx.db.insert("gameEvents", {
                gameId: game._id,
                seq: nextSeq++,
                type: "end",
                leftScoreAfter: game.leftScore,
                rightScoreAfter: game.rightScore,
                leftSetsAfter: game.leftSets,
                rightSetsAfter: game.rightSets,
                createdAt: now,
                actorDeviceId: "system", // Inactivity
            });

            await ctx.db.patch(game._id, {
                status: "finished",
                endedAt: now,
                endedReason: "inactivity",
                pendingPoint: null,
                nextSeq,
                updatedAt: now,
            });
        }
    },
});

const crons = cronJobs();

crons.interval(
    "auto-finish-stale-games",
    { minutes: 15 },
    internal.crons.autoFinishJob
);

export default crons;
