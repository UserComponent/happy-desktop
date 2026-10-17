/** Display names for the provider types the daemon configures. */
const SERVICE_NAMES: Readonly<Record<string, string>> = {
    bedrock: "Bedrock",
    claude: "Claude",
    codex: "Codex",
    copilot: "GitHub Copilot",
    grok: "Grok",
};

/**
 * What to call a service, from the provider type the daemon configured.
 *
 * Several accounts may share one type, so this names the service and never one
 * account. A type without a known name is shown as its configured key, titled.
 */
export function providerServiceName(type: string): string {
    return (
        SERVICE_NAMES[type] ??
        type
            .split(/[_-]/)
            .filter(Boolean)
            .map((part) => part[0]!.toUpperCase() + part.slice(1))
            .join(" ")
    );
}
