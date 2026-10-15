import { describe, expect, it } from "vitest";
import {
    sidePanelLayoutStoreCreate,
    sidePanelLayoutStoreNoop,
    type SidePanelLayoutPersistence,
    type SidePanelLayoutSnapshot,
} from "./sidePanelLayoutStore.js";

function persistence(initial: unknown) {
    const writes: SidePanelLayoutSnapshot[] = [];
    const value: SidePanelLayoutPersistence = {
        read: () => initial,
        write: (document) => {
            writes.push(document);
        },
    };
    return { value, writes };
}

describe("The side panel layout record", () => {
    it.each([undefined, null, 7, "application", [], {}, { scope: "everywhere" }])(
        "reads %j as per-workspace scope with a closed panel and no width",
        (stored) => {
            const store = sidePanelLayoutStoreCreate(persistence(stored).value);
            expect(store.get()).toEqual({ scope: "workspace", open: false });
        },
    );

    it("reads an unreadable record as the default", () => {
        const store = sidePanelLayoutStoreCreate({
            read: () => {
                throw new Error("denied");
            },
            write: () => undefined,
        });
        expect(store.get()).toEqual({ scope: "workspace", open: false });
    });

    it("keeps valid values and rounds the width", () => {
        const store = sidePanelLayoutStoreCreate(
            persistence({ scope: "application", width: 400.6, open: true }).value,
        );
        expect(store.get()).toEqual({ scope: "application", width: 401, open: true });
    });

    it.each([119, 8001, Number.NaN, Number.POSITIVE_INFINITY, "400", null])(
        "drops the width %j",
        (width) => {
            const store = sidePanelLayoutStoreCreate(
                persistence({ scope: "application", width, open: true }).value,
            );
            expect(store.get()).toEqual({ scope: "application", open: true });
        },
    );

    it("reads a non-boolean open as false", () => {
        const store = sidePanelLayoutStoreCreate(persistence({ open: "yes" }).value);
        expect(store.get().open).toBe(false);
    });
});

describe("The side panel layout store", () => {
    it("persists and notifies each change", () => {
        const { value, writes } = persistence(undefined);
        const store = sidePanelLayoutStoreCreate(value);
        let notified = 0;
        store.subscribe(() => (notified += 1));
        store.widthUpdate(500);
        store.openUpdate(true);
        expect(store.get()).toEqual({ scope: "workspace", width: 500, open: true });
        expect(writes).toHaveLength(2);
        expect(writes.at(-1)).toEqual({ scope: "workspace", width: 500, open: true });
        expect(notified).toBe(2);
    });

    it("does nothing for equal values", () => {
        const { value, writes } = persistence({ scope: "application", width: 500, open: true });
        const store = sidePanelLayoutStoreCreate(value);
        let notified = 0;
        store.subscribe(() => (notified += 1));
        store.widthUpdate(500);
        store.widthUpdate(500.2);
        store.openUpdate(true);
        store.scopeUpdate("application");
        store.scopeUpdate("application", { width: 500, open: true });
        expect(writes).toHaveLength(0);
        expect(notified).toBe(0);
    });

    it("ignores a width it cannot keep", () => {
        const { value, writes } = persistence(undefined);
        const store = sidePanelLayoutStoreCreate(value);
        store.widthUpdate(Number.NaN);
        store.widthUpdate(50);
        expect(writes).toHaveLength(0);
    });

    it("takes the panel on screen when entering application scope", () => {
        const store = sidePanelLayoutStoreCreate(persistence({ width: 300, open: true }).value);
        store.scopeUpdate("application", { width: 640, open: false });
        expect(store.get()).toEqual({ scope: "application", width: 640, open: false });
    });

    it("clears the width when the screen shows the default", () => {
        const store = sidePanelLayoutStoreCreate(persistence({ width: 300, open: true }).value);
        store.scopeUpdate("application", { open: true });
        expect(store.get()).toEqual({ scope: "application", open: true });
    });

    it("keeps the last width and open state when returning to workspace scope", () => {
        const store = sidePanelLayoutStoreCreate(persistence(undefined).value);
        store.scopeUpdate("application", { width: 640, open: true });
        store.scopeUpdate("workspace");
        expect(store.get()).toEqual({ scope: "workspace", width: 640, open: true });
    });

    it("survives a write that throws", () => {
        const store = sidePanelLayoutStoreCreate({
            read: () => undefined,
            write: () => {
                throw new Error("denied");
            },
        });
        store.openUpdate(true);
        expect(store.get().open).toBe(true);
    });

    it("has a noop store that stays per workspace", () => {
        sidePanelLayoutStoreNoop.scopeUpdate("application", { width: 300, open: true });
        sidePanelLayoutStoreNoop.openUpdate(true);
        expect(sidePanelLayoutStoreNoop.get()).toEqual({ scope: "workspace", open: false });
    });
});
