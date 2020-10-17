type BotConfig = {
    prefix: string,
    capturePeriod: number
};

// The bot's default config information
const config: BotConfig = {
    // The default prefix the bot responds to
    prefix: "b/",
    // The time required between player animal captures, in milliseconds
    capturePeriod: 1 * 60 * 1000
};

export default config;