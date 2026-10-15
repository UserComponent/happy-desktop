export type SidePanelLayoutScope = "workspace" | "application";

/**
 * Whether the right panel's width and open state belong to each workspace or to
 * the whole window. The window's own choice, kept by the host. In workspace
 * scope `width` and `open` are kept but not read.
 */
export interface SidePanelLayoutSnapshot {
    readonly scope: SidePanelLayoutScope;
    /** The window-wide panel width; absent means the shell's default. Read only in application scope. */
    readonly width?: number;
    /** Whether the panel shows, window-wide. Read only in application scope. */
    readonly open: boolean;
}

export interface SidePanelLayoutPersistence {
    read(): unknown;
    write(document: SidePanelLayoutSnapshot): void;
}

export interface SidePanelLayoutStore {
    get(): SidePanelLayoutSnapshot;
    subscribe(listener: () => void): () => void;
    /** Changes the scope. Entering application scope takes the panel as it is on screen. */
    scopeUpdate(
        scope: SidePanelLayoutScope,
        onScreen?: { readonly width?: number; readonly open: boolean },
    ): void;
    widthUpdate(width: number): void;
    openUpdate(open: boolean): void;
}

const DEFAULT: SidePanelLayoutSnapshot = { scope: "workspace", open: false };
const WIDTH_MIN = 120;
const WIDTH_MAX = 8000;

function widthParse(value: unknown): number | undefined {
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    if (value < WIDTH_MIN || value > WIDTH_MAX) return undefined;
    return Math.round(value);
}

function snapshotParse(raw: unknown): SidePanelLayoutSnapshot {
    // A hand-edited or missing record keeps the defaults field by field.
    if (typeof raw !== "object" || raw === null) return DEFAULT;
    const stored = raw as Partial<Record<keyof SidePanelLayoutSnapshot, unknown>>;
    const width = widthParse(stored.width);
    return {
        scope: stored.scope === "application" ? "application" : "workspace",
        ...(width === undefined ? {} : { width }),
        open: stored.open === true,
    };
}

export function sidePanelLayoutStoreCreate(
    persistence?: SidePanelLayoutPersistence,
): SidePanelLayoutStore {
    let snapshot: SidePanelLayoutSnapshot;
    try {
        snapshot = snapshotParse(persistence?.read());
    } catch {
        snapshot = DEFAULT;
    }
    const listeners = new Set<() => void>();
    const commit = (next: SidePanelLayoutSnapshot): void => {
        snapshot = next;
        try {
            persistence?.write(snapshot);
        } catch {
            // A storage-denied renderer keeps the choice for this window's lifetime.
        }
        for (const listener of listeners) listener();
    };
    return {
        get: () => snapshot,
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        scopeUpdate(scope, onScreen) {
            if (scope === "workspace") {
                if (snapshot.scope !== "workspace") commit({ ...snapshot, scope });
                return;
            }
            const width = onScreen === undefined ? snapshot.width : widthParse(onScreen.width);
            const open = onScreen === undefined ? snapshot.open : onScreen.open;
            if (snapshot.scope === scope && snapshot.width === width && snapshot.open === open) {
                return;
            }
            commit({ scope, ...(width === undefined ? {} : { width }), open });
        },
        widthUpdate(width) {
            const next = widthParse(width);
            if (next === undefined || next === snapshot.width) return;
            commit({ ...snapshot, width: next });
        },
        openUpdate(open) {
            if (snapshot.open !== open) commit({ ...snapshot, open });
        },
    };
}

export const sidePanelLayoutStoreNoop: SidePanelLayoutStore = {
    get: () => DEFAULT,
    subscribe: () => () => undefined,
    scopeUpdate: () => undefined,
    widthUpdate: () => undefined,
    openUpdate: () => undefined,
};
