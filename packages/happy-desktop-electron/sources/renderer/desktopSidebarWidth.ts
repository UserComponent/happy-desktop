import type { HappyAgentSidebarWidthPersistence } from "happy-desktop-state";

const SIDEBAR_WIDTH_KEY = "happy.sidebar-width.v1";

/**
 * How long a run of widths is allowed to settle before it is written down.
 * Dragging the sidebar reports every pointer move; the newest value always wins
 * and is always eventually written, so a drag costs one write instead of many.
 */
const WRITE_SETTLE_MS = 250;

/**
 * Where this machine remembers how wide the left sidebar was dragged.
 *
 * The window's own storage: how wide someone likes the sidebar is about the
 * person in front of this app, not about any connection.
 */
function persistenceCreate(): HappyAgentSidebarWidthPersistence {
    let pending: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const flush = (): void => {
        timer = undefined;
        const width = pending;
        pending = undefined;
        if (width === undefined) return;
        try {
            localStorage.setItem(SIDEBAR_WIDTH_KEY, JSON.stringify(width));
        } catch {
            // A storage-denied renderer still keeps the width on screen for as
            // long as this window stays open.
        }
    };

    // A window closing mid-settle would otherwise drop the last drag.
    const flushNow = (): void => {
        if (timer === undefined) return;
        clearTimeout(timer);
        flush();
    };
    window.addEventListener("pagehide", flushNow);
    window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flushNow();
    });

    return {
        read() {
            try {
                const value = localStorage.getItem(SIDEBAR_WIDTH_KEY);
                return value ? (JSON.parse(value) as unknown) : undefined;
            } catch {
                return undefined;
            }
        },
        write(width) {
            pending = width;
            if (timer !== undefined) return;
            timer = setTimeout(flush, WRITE_SETTLE_MS);
        },
    };
}

/** The window's one sidebar-width store; a singleton so listeners are added once. */
let shared: HappyAgentSidebarWidthPersistence | undefined;
export function desktopSidebarWidthPersistence(): HappyAgentSidebarWidthPersistence {
    shared ??= persistenceCreate();
    return shared;
}
