import { HappyAgentLayoutSettings } from "../../src";
import { ComponentPage, Specimen } from "../kit";

/** The component plan this page documents. The selector and the page header read the same value. */
export const componentNumber = "P-020";

const noop = () => undefined;

export function HappyAgentLayoutSettingsPage() {
    return (
        <ComponentPage
            number={componentNumber}
            summary="The Layout section of General settings: whether the side panel keeps its width and open state per workspace or for the whole window."
            title="Layout settings"
        >
            <div className="specimen-grid">
                <Specimen
                    detail="Each workspace keeps its own panel width and open state"
                    label="Per workspace"
                    number="01"
                    stage="surface"
                >
                    <div style={{ display: "flex", width: "560px", padding: "24px" }}>
                        <HappyAgentLayoutSettings
                            onSidePanelLayoutChange={noop}
                            sidePanelLayout="workspace"
                        />
                    </div>
                </Specimen>
                <Specimen
                    detail="One panel width and open state for every workspace"
                    label="Same everywhere"
                    number="02"
                    stage="surface"
                >
                    <div style={{ display: "flex", width: "560px", padding: "24px" }}>
                        <HappyAgentLayoutSettings
                            onSidePanelLayoutChange={noop}
                            sidePanelLayout="application"
                        />
                    </div>
                </Specimen>
            </div>
        </ComponentPage>
    );
}
