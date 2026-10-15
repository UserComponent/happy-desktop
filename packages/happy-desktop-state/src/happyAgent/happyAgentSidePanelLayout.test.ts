import { describe, expect, it } from "vitest";
import { sidePanelLayoutStoreCreate } from "../sidePanelLayout/sidePanelLayoutStore.js";
import type { HappyAgentWorkspaceClient } from "./happyAgentClient.js";
import { happyAgentPanelStoreCreate } from "./happyAgentPanelStore.js";
import type { HappyAgentPanelMemory } from "./happyAgentWorkspaceMemory.js";
import type { HappyAgentGroupId } from "./happyAgentTypes.js";
import type {
    HappyAgentViewPreferencesDocument,
    HappyAgentViewPreferencesPersistence,
} from "./happyAgentViewPreferences.js";
import { happyAgentWorkspaceStoreCreate } from "./happyAgentWorkspaceStore.js";

const A = "prj_a" as HappyAgentGroupId;
const B = "prj_b" as HappyAgentGroupId;

function memory(open: boolean): HappyAgentPanelMemory {
    return { open, browsers: [], active: { type: "files" } };
}

/** Every collaborator the layout does not exercise answers inertly. */
function inert(): unknown {
    return new Proxy(() => undefined, {
        get: (_target, property) =>
            property === "then"
                ? undefined
                : property === Symbol.iterator
                  ? function* () {}
                  : inert(),
        apply: () => undefined,
    });
}

function inertWith(target: Record<PropertyKey, unknown>): unknown {
    return new Proxy(target, { get: (t, property) => (property in t ? t[property] : inert()) });
}

function workspaceStore(options: {
    readonly layout?: ReturnType<typeof sidePanelLayoutStoreCreate>;
    readonly remembered?: ReadonlyMap<HappyAgentGroupId, HappyAgentPanelMemory>;
}) {
    const loading = { type: "loading" } as const;
    const list = inertWith({
        projects: loading,
        bots: [],
        tasks: [],
        botsCreating: [],
        archivedSessions: [],
        revision: 0,
    });
    const memoryWrites = new Map<HappyAgentGroupId, HappyAgentPanelMemory>();
    const client = inertWith({
        models: {
            get: () => loading,
            load: () => new Promise(() => undefined),
            subscribe: () => () => undefined,
        },
        memory: inertWith({
            groupRead: (groupId: HappyAgentGroupId) => {
                const stored = memoryWrites.get(groupId) ?? options.remembered?.get(groupId);
                return stored === undefined ? undefined : { panel: stored };
            },
            groupPanelWrite: (groupId: HappyAgentGroupId, panel: HappyAgentPanelMemory) => {
                memoryWrites.set(groupId, panel);
            },
        }),
        sessionList: () => inertWith({ get: () => list, subscribe: () => () => undefined }),
        chat: () => new Promise(() => undefined),
        openInTargetsRead: () => new Promise(() => undefined),
    }) as unknown as HappyAgentWorkspaceClient;
    let document: HappyAgentViewPreferencesDocument | undefined;
    const viewPreferences: HappyAgentViewPreferencesPersistence = {
        read: () => document,
        write: (next) => {
            document = next;
        },
    };
    const workspace = happyAgentWorkspaceStoreCreate(client, {
        viewPreferences,
        ...(options.layout === undefined ? {} : { sidePanelLayout: options.layout }),
    });
    const unsubscribe = workspace.subscribe(() => undefined);
    return {
        workspace,
        unsubscribe,
        memoryWrites,
        stored: (group: HappyAgentGroupId) => document?.groups[group]?.panelWidth,
    };
}

describe("The panel width follows the side panel layout scope", () => {
    it("shows each workspace's own width in workspace scope", () => {
        const layout = sidePanelLayoutStoreCreate();
        const { workspace, stored, unsubscribe } = workspaceStore({ layout });
        workspace.groupOpen(A);
        workspace.panelWidthUpdate(A, 500);
        expect(workspace.get().panelWidth).toBe(500);
        workspace.groupOpen(B);
        expect(workspace.get().panelWidth).toBeUndefined();
        workspace.panelWidthUpdate(B, 600);
        expect(workspace.get().panelWidth).toBe(600);
        expect(stored(A)).toBe(500);
        expect(stored(B)).toBe(600);
        expect(layout.get().width).toBeUndefined();
        unsubscribe();
    });

    it("shows the window's width everywhere and writes only the record in application scope", () => {
        const layout = sidePanelLayoutStoreCreate();
        const { workspace, stored, unsubscribe } = workspaceStore({ layout });
        workspace.groupOpen(A);
        workspace.panelWidthUpdate(A, 500);
        workspace.groupOpen(B);
        workspace.panelWidthUpdate(B, 600);
        layout.scopeUpdate("application", { width: 600, open: false });
        expect(workspace.get().panelWidth).toBe(600);
        workspace.groupOpen(A);
        expect(workspace.get().panelWidth).toBe(600);

        workspace.panelWidthUpdate(A, 700);
        expect(layout.get().width).toBe(700);
        expect(workspace.get().panelWidth).toBe(700);
        workspace.groupOpen(B);
        expect(workspace.get().panelWidth).toBe(700);
        expect(stored(A)).toBe(500);
        expect(stored(B)).toBe(600);
        unsubscribe();
    });

    it("shows the default width in application scope when the window has none", () => {
        const layout = sidePanelLayoutStoreCreate();
        const { workspace, unsubscribe } = workspaceStore({ layout });
        workspace.groupOpen(A);
        workspace.panelWidthUpdate(A, 500);
        layout.scopeUpdate("application", { open: false });
        expect(workspace.get().panelWidth).toBeUndefined();
        unsubscribe();
    });

    it("restores each workspace's own width and open state when switching back", () => {
        const layout = sidePanelLayoutStoreCreate();
        const { workspace, stored, memoryWrites, unsubscribe } = workspaceStore({ layout });
        workspace.groupOpen(A);
        workspace.panelWidthUpdate(A, 500);
        workspace.panel.filesSelect();
        workspace.groupOpen(B);
        workspace.panelWidthUpdate(B, 600);
        expect(workspace.panel.get().open).toBe(false);
        expect(memoryWrites.get(A)?.open).toBe(true);

        // The panel on screen is B's: 600 wide and closed.
        layout.scopeUpdate("application", { width: 600, open: false });
        workspace.panelWidthUpdate(B, 900);
        workspace.panel.filesSelect();
        expect(layout.get()).toMatchObject({ scope: "application", width: 900, open: true });
        workspace.groupOpen(A);
        expect(workspace.panel.get().open).toBe(true);
        expect(workspace.get().panelWidth).toBe(900);
        workspace.panel.panelToggle();
        expect(layout.get().open).toBe(false);
        workspace.groupOpen(B);
        expect(workspace.panel.get().open).toBe(false);

        layout.scopeUpdate("workspace");
        expect(stored(A)).toBe(500);
        expect(stored(B)).toBe(600);
        expect(workspace.get().panelWidth).toBe(600);
        expect(workspace.panel.get().open).toBe(false);
        expect(memoryWrites.get(A)?.open).toBe(true);
        expect(memoryWrites.get(B)?.open ?? false).toBe(false);
        workspace.groupOpen(A);
        expect(workspace.get().panelWidth).toBe(500);
        expect(workspace.panel.get().open).toBe(true);
        unsubscribe();
    });
});

describe("The panel's open state in application scope", () => {
    it("survives a group switch and leaves each group's own state alone", () => {
        const layout = sidePanelLayoutStoreCreate({
            read: () => ({ scope: "application", open: false }),
            write: () => undefined,
        });
        const written = new Map<HappyAgentGroupId, HappyAgentPanelMemory>();
        const stored = new Map<HappyAgentGroupId, HappyAgentPanelMemory>([
            [A, memory(false)],
            [B, memory(false)],
        ]);
        const panel = happyAgentPanelStoreCreate({
            terminalOpen: () => {
                throw new Error("no terminal");
            },
            memoryRead: (group) => stored.get(group),
            memoryWrite: (group, next) => {
                written.set(group, next);
            },
            layout,
        });
        panel.scopeApply(A, undefined);
        panel.filesSelect();
        expect(panel.get().open).toBe(true);
        expect(layout.get().open).toBe(true);
        // Whatever was written for A is still A's own, closed state.
        expect(written.get(A)?.open).toBe(false);

        panel.scopeApply(B, undefined);
        expect(panel.get().open).toBe(true);
        expect(stored.get(B)?.open).toBe(false);
        expect(written.get(B)).toBeUndefined();

        panel.panelToggle();
        expect(layout.get().open).toBe(false);
        panel.scopeApply(A, undefined);
        expect(panel.get().open).toBe(false);
        panel[Symbol.dispose]();
    });

    it("keeps today's per-group behavior without a layout", () => {
        const stored = new Map<HappyAgentGroupId, HappyAgentPanelMemory>([[B, memory(false)]]);
        const panel = happyAgentPanelStoreCreate({
            terminalOpen: () => {
                throw new Error("no terminal");
            },
            memoryRead: (group) => stored.get(group),
        });
        panel.scopeApply(A, undefined);
        panel.filesSelect();
        panel.scopeApply(B, undefined);
        expect(panel.get().open).toBe(false);
        panel.scopeApply(A, undefined);
        expect(panel.get().open).toBe(true);
        panel[Symbol.dispose]();
    });
});
