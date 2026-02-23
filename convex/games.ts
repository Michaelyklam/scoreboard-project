import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { generateGameCode, hashSecret, normalizeSearchText } from "./utils";
import type { Doc, Id } from "./_generated/dataModel";

export const getByCode = query({
    args: { gameCode: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("games")
            .withIndex("by_gameCode", (q) => q.eq("gameCode", args.gameCode))
            .unique();
    },
});

export const listActive = query({
    args: { limit: v.number(), cursor: v.optional(v.string()) },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("games")
            .withIndex("by_status_updatedAt", (q) => q.eq("status", "live"))
            .order("desc")
            .paginate({ cursor: args.cursor ?? null, numItems: args.limit });
    },
});

export const searchArchive = query({
    args: { query: v.string(), date: v.optional(v.string()), limit: v.number(), cursor: v.optional(v.string()) },
    handler: async (ctx, args) => {
        let startOfDay = 0;
        let endOfDay = 0;

        if (args.date) {
            // Parse date in YYYY-MM-DD
            const [year, month, day] = args.date.split('-');
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            startOfDay = dateObj.getTime();
            endOfDay = startOfDay + 24 * 60 * 60 * 1000;
        }

        if (args.query.trim().length > 0) {
            const cleanQuery = args.query
                .toLowerCase()
                .replace(/\b(vs|v|and|match)\b/g, "")
                .replace(/[&,.-]/g, " ")
                .trim()
                .replace(/\s+/g, " ");

            let q = ctx.db.query("games")
                .withSearchIndex("search_search_text", (q) => q.search("searchText", cleanQuery));

            if (args.date) {
                return await q.filter(q => q.and(
                    q.eq(q.field("status"), "finished"),
                    q.gte(q.field("endedAt"), startOfDay),
                    q.lt(q.field("endedAt"), endOfDay)
                )).paginate({ cursor: args.cursor ?? null, numItems: args.limit });
            } else {
                return await q.filter(q => q.eq(q.field("status"), "finished"))
                    .paginate({ cursor: args.cursor ?? null, numItems: args.limit });
            }
        }

        if (args.date) {
            return await ctx.db.query("games")
                .withIndex("by_status_endedAt", q =>
                    q.eq("status", "finished")
                        .gte("endedAt", startOfDay)
                        .lt("endedAt", endOfDay)
                )
                .order("desc")
                .paginate({ cursor: args.cursor ?? null, numItems: args.limit });
        }

        return await ctx.db.query("games")
            .withIndex("by_status_endedAt", q => q.eq("status", "finished"))
            .order("desc")
            .paginate({ cursor: args.cursor ?? null, numItems: args.limit });
    },
});

async function verifyGameAccess(ctx: MutationCtx, gameId: Id<"games">, editorSecret: string) {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");
    const hashed = await hashSecret(editorSecret);
    if (game.editorSecretHash !== hashed) {
        throw new Error("Unauthorized");
    }
    return game;
}

// Flush pending point to events
async function flushPendingPoint(ctx: MutationCtx, game: Doc<"games">) {
    if (!game.pendingPoint) return game.nextSeq;

    await ctx.db.insert("gameEvents", {
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

    return game.nextSeq + 1;
}

export const create = mutation({
    args: {
        leftTeamName: v.string(),
        rightTeamName: v.string(),
        creatorDeviceId: v.string(),
        editorSecret: v.string(),
    },
    handler: async (ctx, args) => {
        const gameCode = generateGameCode();
        const secretHash = await hashSecret(args.editorSecret);
        const now = Date.now();

        const gameId = await ctx.db.insert("games", {
            gameCode,
            status: "live",
            leftTeamName: args.leftTeamName,
            rightTeamName: args.rightTeamName,
            leftScore: 0,
            rightScore: 0,
            leftSets: 0,
            rightSets: 0,
            creatorDeviceId: args.creatorDeviceId,
            editorSecretHash: secretHash,
            pendingPoint: null,
            nextSeq: 0,
            createdAt: now,
            updatedAt: now,
            lastActivityAt: now,
            autoFinishAt: now + 12 * 60 * 60 * 1000,
            reopenCount: 0,
            searchText: normalizeSearchText(gameCode, args.leftTeamName, args.rightTeamName),
        });

        return { gameId, gameCode };
    },
});

export const adjustScore = mutation({
    args: {
        gameId: v.id("games"),
        side: v.union(v.literal("left"), v.literal("right")),
        delta: v.union(v.literal(1), v.literal(-1)),
        editorSecret: v.string(),
        actorDeviceId: v.string(),
    },
    handler: async (ctx, args) => {
        const game = await verifyGameAccess(ctx, args.gameId, args.editorSecret);
        if (game.status !== "live") throw new Error("Game is not active");

        const now = Date.now();
        let leftScoreAfter = game.leftScore;
        let rightScoreAfter = game.rightScore;

        if (args.side === "left") {
            leftScoreAfter = Math.max(0, leftScoreAfter + args.delta);
        } else {
            rightScoreAfter = Math.max(0, rightScoreAfter + args.delta);
        }

        if (leftScoreAfter === game.leftScore && rightScoreAfter === game.rightScore) {
            return;
        }

        let nextSeq = game.nextSeq;
        let newPending: typeof game.pendingPoint = null;

        if (game.pendingPoint) {
            const isReverse = game.pendingPoint.side === args.side && Math.sign(game.pendingPoint.delta) !== Math.sign(args.delta);
            if (isReverse) {
                newPending = null;
            } else {
                await ctx.db.insert("gameEvents", {
                    gameId: args.gameId,
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

                newPending = {
                    side: args.side,
                    delta: args.delta,
                    actorDeviceId: args.actorDeviceId,
                    createdAt: now,
                    leftScoreAfter,
                    rightScoreAfter,
                };
            }
        } else {
            newPending = {
                side: args.side,
                delta: args.delta,
                actorDeviceId: args.actorDeviceId,
                createdAt: now,
                leftScoreAfter,
                rightScoreAfter,
            };
        }

        await ctx.db.patch(args.gameId, {
            leftScore: leftScoreAfter,
            rightScore: rightScoreAfter,
            pendingPoint: newPending,
            nextSeq,
            updatedAt: now,
            lastActivityAt: now,
            autoFinishAt: now + 12 * 60 * 60 * 1000,
        });
    },
});

export const adjustSet = mutation({
    args: {
        gameId: v.id("games"),
        side: v.union(v.literal("left"), v.literal("right")),
        delta: v.union(v.literal(1), v.literal(-1)),
        editorSecret: v.string(),
        actorDeviceId: v.string(),
    },
    handler: async (ctx, args) => {
        const game = await verifyGameAccess(ctx, args.gameId, args.editorSecret);
        if (game.status !== "live") throw new Error("Game is not active");

        let leftSetsAfter = game.leftSets;
        let rightSetsAfter = game.rightSets;

        if (args.side === "left") {
            leftSetsAfter = Math.max(0, leftSetsAfter + args.delta);
        } else {
            rightSetsAfter = Math.max(0, rightSetsAfter + args.delta);
        }

        if (leftSetsAfter === game.leftSets && rightSetsAfter === game.rightSets) return;

        let nextSeq = await flushPendingPoint(ctx, game);
        const now = Date.now();

        await ctx.db.insert("gameEvents", {
            gameId: args.gameId,
            seq: nextSeq++,
            type: "set",
            side: args.side,
            delta: args.delta,
            leftScoreAfter: game.leftScore,
            rightScoreAfter: game.rightScore,
            leftSetsAfter,
            rightSetsAfter,
            createdAt: now,
            actorDeviceId: args.actorDeviceId,
        });

        await ctx.db.patch(args.gameId, {
            leftSets: leftSetsAfter,
            rightSets: rightSetsAfter,
            pendingPoint: null,
            nextSeq,
            updatedAt: now,
            lastActivityAt: now,
            autoFinishAt: now + 12 * 60 * 60 * 1000,
        });
    },
});

export const endSet = mutation({
    args: {
        gameId: v.id("games"),
        editorSecret: v.string(),
        actorDeviceId: v.string(),
    },
    handler: async (ctx, args) => {
        const game = await verifyGameAccess(ctx, args.gameId, args.editorSecret);
        if (game.status !== "live") throw new Error("Game is not active");

        let leftSetsAfter = game.leftSets;
        let rightSetsAfter = game.rightSets;

        let winner: "left" | "right" | null = null;
        if (game.leftScore > game.rightScore) {
            leftSetsAfter += 1;
            winner = "left";
        } else if (game.rightScore > game.leftScore) {
            rightSetsAfter += 1;
            winner = "right";
        }

        if (!winner) {
            throw new Error("Cannot end set when scores are tied");
        }

        let nextSeq = await flushPendingPoint(ctx, game);
        const now = Date.now();

        await ctx.db.insert("gameEvents", {
            gameId: args.gameId,
            seq: nextSeq++,
            type: "set",
            side: winner,
            delta: 1,
            leftScoreAfter: 0,
            rightScoreAfter: 0,
            leftSetsAfter,
            rightSetsAfter,
            createdAt: now,
            actorDeviceId: args.actorDeviceId,
        });

        await ctx.db.patch(args.gameId, {
            leftSets: leftSetsAfter,
            rightSets: rightSetsAfter,
            leftScore: 0,
            rightScore: 0,
            pendingPoint: null,
            nextSeq,
            updatedAt: now,
            lastActivityAt: now,
            autoFinishAt: now + 12 * 60 * 60 * 1000,
        });
    },
});

export const renameTeam = mutation({
    args: {
        gameId: v.id("games"),
        side: v.union(v.literal("left"), v.literal("right")),
        newName: v.string(),
        editorSecret: v.string(),
        actorDeviceId: v.string(),
    },
    handler: async (ctx, args) => {
        const game = await verifyGameAccess(ctx, args.gameId, args.editorSecret);
        if (game.status !== "live") throw new Error("Game is not active");

        let nextSeq = await flushPendingPoint(ctx, game);
        const now = Date.now();

        const leftTeamName = args.side === "left" ? args.newName : game.leftTeamName;
        const rightTeamName = args.side === "right" ? args.newName : game.rightTeamName;

        await ctx.db.insert("gameEvents", {
            gameId: args.gameId,
            seq: nextSeq++,
            type: "rename",
            leftScoreAfter: game.leftScore,
            rightScoreAfter: game.rightScore,
            leftSetsAfter: game.leftSets,
            rightSetsAfter: game.rightSets,
            createdAt: now,
            actorDeviceId: args.actorDeviceId,
        });

        await ctx.db.patch(args.gameId, {
            leftTeamName,
            rightTeamName,
            searchText: normalizeSearchText(game.gameCode, leftTeamName, rightTeamName),
            pendingPoint: null,
            nextSeq,
            updatedAt: now,
            lastActivityAt: now,
            autoFinishAt: now + 12 * 60 * 60 * 1000,
        });
    },
});

export const end = mutation({
    args: { gameId: v.id("games"), editorSecret: v.string(), actorDeviceId: v.string() },
    handler: async (ctx, args) => {
        const game = await verifyGameAccess(ctx, args.gameId, args.editorSecret);
        if (game.status === "finished") return;

        let nextSeq = await flushPendingPoint(ctx, game);
        const now = Date.now();

        await ctx.db.insert("gameEvents", {
            gameId: args.gameId,
            seq: nextSeq++,
            type: "end",
            leftScoreAfter: game.leftScore,
            rightScoreAfter: game.rightScore,
            leftSetsAfter: game.leftSets,
            rightSetsAfter: game.rightSets,
            createdAt: now,
            actorDeviceId: args.actorDeviceId,
        });

        await ctx.db.patch(args.gameId, {
            status: "finished",
            endedAt: now,
            endedReason: "manual",
            pendingPoint: null,
            nextSeq,
            updatedAt: now,
        });
    },
});

export const reopen = mutation({
    args: { gameId: v.id("games"), editorSecret: v.string(), actorDeviceId: v.string() },
    handler: async (ctx, args) => {
        const game = await verifyGameAccess(ctx, args.gameId, args.editorSecret);
        if (game.status === "live") return;

        let nextSeq = game.nextSeq;
        const now = Date.now();

        await ctx.db.insert("gameEvents", {
            gameId: args.gameId,
            seq: nextSeq++,
            type: "reopen",
            leftScoreAfter: game.leftScore,
            rightScoreAfter: game.rightScore,
            leftSetsAfter: game.leftSets,
            rightSetsAfter: game.rightSets,
            createdAt: now,
            actorDeviceId: args.actorDeviceId,
        });

        await ctx.db.patch(args.gameId, {
            status: "live",
            endedAt: undefined,
            endedReason: undefined,
            reopenCount: game.reopenCount + 1,
            nextSeq,
            updatedAt: now,
            lastActivityAt: now,
            autoFinishAt: now + 12 * 60 * 60 * 1000,
        });
    },
});
