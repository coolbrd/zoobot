type BotConfig = {
    prefix: string,
    encounterPeriod: number,
    capturePeriod: number
};

// The bot's default config information
const config: BotConfig = {
    // The default prefix the bot responds to
    prefix: "b/",
    // The default time between player free encounter resets
    encounterPeriod: 1 * 60 * 1000,
    // The time required between player free animal capture resets
    capturePeriod: 5 * 60 * 1000
};

export default config;