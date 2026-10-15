import { FormRow } from "../../FormRow";
import { SegmentedControl } from "../../SegmentedControl";
import { HappyAgentSettingsSection } from "./HappyAgentSettingsShell";

export type HappyAgentSidePanelLayoutChoice = "workspace" | "application";

export type HappyAgentLayoutSettingsProps = {
    /** Whether the side panel's width and open state belong to each workspace or to the window. */
    sidePanelLayout: HappyAgentSidePanelLayoutChoice;
    onSidePanelLayoutChange: (scope: HappyAgentSidePanelLayoutChoice) => void;
};

const sidePanelLayoutSegments = [
    { value: "workspace", label: "Per workspace" },
    { value: "application", label: "Same everywhere" },
];

/** The Layout section of General: how the side panel's size and visibility are kept. */
export function HappyAgentLayoutSettings(props: HappyAgentLayoutSettingsProps) {
    return (
        <HappyAgentSettingsSection title="Layout">
            <FormRow
                control={
                    <SegmentedControl
                        aria-label="Side panel layout"
                        onChange={(value) =>
                            props.onSidePanelLayoutChange(value as HappyAgentSidePanelLayoutChoice)
                        }
                        segments={sidePanelLayoutSegments}
                        size="small"
                        value={props.sidePanelLayout}
                    />
                }
                description="Same everywhere keeps one panel width and open state for all workspaces."
                label="Side panel layout"
            />
        </HappyAgentSettingsSection>
    );
}
