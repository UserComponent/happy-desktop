/**
 * Whether the window's left side is folded away. The sidebar is what the
 * reader hides, with its toggle or Command-B, but the fold belongs to the
 * window rather than to any one connection: the connection rail stands beside
 * the sidebar and goes with it, and switching machines does not bring the
 * sidebar back. One store per window, shared by every connection it shows.
 *
 * Memory only. A hidden sidebar is a posture for this sitting, not an
 * arrangement worth keeping across launches.
 */
export interface HappyAgentSidebarVisibilitySnapshot {
    /** The sidebar, and the rail beside it, are folded away. */
    readonly hidden: boolean;
    /**
     * The width the reader dragged the sidebar to; Settings takes it too. The
     * host can keep it across launches through a width persistence.
     */
    readonly width?: number;
}

export interface HappyAgentSidebarVisibilityStore {
    get(): HappyAgentSidebarVisibilitySnapshot;
    subscribe(listener: () => void): () => void;
    /** Folds the left side away, or brings it back. */
    sidebarHiddenUpdate(hidden: boolean): void;
    sidebarWidthUpdate(width: number): void;
}

/** Where the host keeps the sidebar width between launches. */
export interface HappyAgentSidebarWidthPersistence {
    /** Whatever was stored; the store accepts only a sane width. */
    read(): unknown;
    write(width: number): void;
}

const WIDTH_MIN = 120;
const WIDTH_MAX = 2000;

function storedWidthRead(persistence: HappyAgentSidebarWidthPersistence | undefined) {
    if (!persistence) return undefined;
    try {
        const value = persistence.read();
        if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
        const width = Math.round(value);
        return width >= WIDTH_MIN && width <= WIDTH_MAX ? width : undefined;
    } catch {
        return undefined;
    }
}

const SHOWN: HappyAgentSidebarVisibilitySnapshot = { hidden: false };

export function happyAgentSidebarVisibilityStoreCreate(
    persistence?: HappyAgentSidebarWidthPersistence,
): HappyAgentSidebarVisibilityStore {
    // Read now, not later: the shell takes its starting width once, at mount.
    const storedWidth = storedWidthRead(persistence);
    let snapshot: HappyAgentSidebarVisibilitySnapshot =
        storedWidth === undefined ? SHOWN : { hidden: false, width: storedWidth };
    const listeners = new Set<() => void>();
    return {
        get: () => snapshot,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        sidebarHiddenUpdate(hidden) {
            if (snapshot.hidden === hidden) return;
            snapshot = { ...snapshot, hidden };
            for (const listener of listeners) listener();
        },
        sidebarWidthUpdate(width) {
            if (snapshot.width === width) return;
            snapshot = { ...snapshot, width };
            for (const listener of listeners) listener();
            try {
                persistence?.write(width);
            } catch {
                // The width stays on screen for as long as this window is open.
            }
        },
    };
}

/** A window whose sidebar is never folded: Blueprint fixtures and the browser shell. */
export const happyAgentSidebarVisibilityStoreNoop: HappyAgentSidebarVisibilityStore = {
    get: () => SHOWN,
    subscribe: () => () => undefined,
    sidebarHiddenUpdate: () => undefined,
    sidebarWidthUpdate: () => undefined,
};
