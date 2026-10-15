import { expect, it, vi } from "vitest";
import {
    happyAgentSidebarVisibilityStoreCreate,
    type HappyAgentSidebarWidthPersistence,
} from "./happyAgentSidebarVisibilityStore.js";

/* The sidebar width survives a launch: the store takes it from the host's
 * persistence when it is created, and hands every new width back. Anything
 * stored that is not a sane width counts as no width. */

function persistenceCreate(stored: unknown) {
    const write = vi.fn<(width: number) => void>();
    const persistence: HappyAgentSidebarWidthPersistence = { read: () => stored, write };
    return Object.assign(persistence, { write });
}

it("starts with a stored width, rounded", () => {
    const store = happyAgentSidebarVisibilityStoreCreate(persistenceCreate(301.6));
    expect(store.get()).toEqual({ hidden: false, width: 302 });
});

it.each([
    ["missing", undefined],
    ["a string", "300"],
    ["NaN", Number.NaN],
    ["too small", 10],
    ["too large", 5000],
])("starts without a width when the stored value is %s", (_name, stored) => {
    const store = happyAgentSidebarVisibilityStoreCreate(persistenceCreate(stored));
    expect(store.get().width).toBeUndefined();
});

it("starts without a width when reading throws", () => {
    const store = happyAgentSidebarVisibilityStoreCreate({
        read: () => {
            throw new Error("denied");
        },
        write: () => undefined,
    });
    expect(store.get().width).toBeUndefined();
});

it("writes a new width and notifies listeners, but not a repeated one", () => {
    const persistence = persistenceCreate(undefined);
    const store = happyAgentSidebarVisibilityStoreCreate(persistence);
    const listener = vi.fn();
    store.subscribe(listener);
    store.sidebarWidthUpdate(320);
    store.sidebarWidthUpdate(320);
    expect(store.get().width).toBe(320);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(persistence.write).toHaveBeenCalledTimes(1);
    expect(persistence.write).toHaveBeenCalledWith(320);
});

it("keeps working when writing throws", () => {
    const store = happyAgentSidebarVisibilityStoreCreate({
        read: () => undefined,
        write: () => {
            throw new Error("full");
        },
    });
    store.sidebarWidthUpdate(400);
    expect(store.get().width).toBe(400);
});

it("does not write when the sidebar is hidden or shown", () => {
    const persistence = persistenceCreate(undefined);
    const store = happyAgentSidebarVisibilityStoreCreate(persistence);
    store.sidebarHiddenUpdate(true);
    store.sidebarHiddenUpdate(false);
    expect(persistence.write).not.toHaveBeenCalled();
});
