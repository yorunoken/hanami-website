const productionOAuthVariables = ["DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET", "OSU_AUTH_CLIENT_ID", "OSU_AUTH_CLIENT_SECRET"] as const;

export function validateProductionOAuthConfiguration(environment: NodeJS.ProcessEnv = process.env): void {
    if (environment.NODE_ENV !== "production") return;

    const missing = productionOAuthVariables.filter((name) => !environment[name]?.trim());
    if (missing.length > 0) {
        throw new Error(`Missing production OAuth configuration: ${missing.join(", ")}`);
    }
}
