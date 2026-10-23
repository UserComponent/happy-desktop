export function usageCreditsText(
    available: boolean,
    unlimited: boolean,
    remainingCents: number | undefined,
): string {
    if (unlimited) return "No personal spending cap";
    if (!available) return "None left";
    if (remainingCents === undefined) return "Available";
    return `$${(remainingCents / 100).toFixed(2)} left`;
}
