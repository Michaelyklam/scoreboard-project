export function getEditorSecret(gameCode: string): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(`scoreboard_secret_${gameCode}`);
}

export function setEditorSecret(gameCode: string, secret: string) {
    if (typeof window === "undefined") return;
    localStorage.setItem(`scoreboard_secret_${gameCode}`, secret);
}

export function getOrCreateDeviceId(): string {
    if (typeof window === "undefined") return "server";
    let deviceId = localStorage.getItem("scoreboard_device_id");
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("scoreboard_device_id", deviceId);
    }
    return deviceId;
}

export function generateSecret(): string {
    return crypto.randomUUID() + crypto.randomUUID();
}
