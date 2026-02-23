import { ConvexClient } from "convex/browser";

export const convex = new ConvexClient(import.meta.env.VITE_CONVEX_URL || "https://example.convex.cloud");

export function createQuery<T = any>(query: any, argsFn: () => Record<string, any>) {
    let result = $state<{ data: T | undefined; isLoading: boolean; error: Error | undefined }>({
        data: undefined,
        isLoading: true,
        error: undefined,
    });

    $effect(() => {
        result.isLoading = true;
        const args = argsFn();
        const unsubscribe = convex.onUpdate(
            query,
            args,
            (newVal: any) => {
                result.data = newVal;
                result.isLoading = false;
                result.error = undefined;
            },
            (err: any) => {
                result.error = err;
                result.isLoading = false;
            }
        );
        return () => unsubscribe();
    });

    return result;
}
