export async function hashSecret(secret: string): Promise<string> {
    // simple SHA-256 for basic security mapping
    const encoder = new TextEncoder();
    const data = encoder.encode(secret);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateGameCode(): string {
    // Generate a random 6-character code
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

export function normalizeSearchText(...texts: string[]): string {
    return texts.map(t => t.toLowerCase().trim()).join(" ");
}
