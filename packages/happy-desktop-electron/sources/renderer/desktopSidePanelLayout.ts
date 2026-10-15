import {
    sidePanelLayoutStoreCreate,
    type SidePanelLayoutPersistence,
    type SidePanelLayoutStore,
} from "happy-desktop-state";

const SIDE_PANEL_LAYOUT_KEY = "happy.panel-layout.v1";

/** The side panel's scope, width and open state, kept in this window's own storage. */
export function desktopSidePanelLayoutPersistence(): SidePanelLayoutPersistence {
    return {
        read() {
            try {
                return JSON.parse(localStorage.getItem(SIDE_PANEL_LAYOUT_KEY) ?? "null") as unknown;
            } catch {
                return undefined;
            }
        },
        write(document) {
            try {
                localStorage.setItem(SIDE_PANEL_LAYOUT_KEY, JSON.stringify(document));
            } catch {
                // A storage-denied renderer keeps the choice for this window's lifetime.
            }
        },
    };
}

let store: SidePanelLayoutStore | undefined;

/** The one layout store of this window, shared by every workspace and Settings. */
export function desktopSidePanelLayoutStore(): SidePanelLayoutStore {
    store ??= sidePanelLayoutStoreCreate(desktopSidePanelLayoutPersistence());
    return store;
}
