type BotConfig = {
    prefix: string,
    encounterPeriod: number,
    capturePeriod: number,
    experiencePerMessage: number
};

// The bot's default config information
const config: BotConfig = {
    // The default prefix the bot responds to
    prefix: "b/",
    // The default time between player free encounter resets
    encounterPeriod: 1 * 60 * 1000,
    // The time required between player free animal capture resets
    capturePeriod: 5 * 60 * 1000,
    // The amount of experience each crew animal gets when their owner sends a message
    experiencePerMessage: 1
};

export default config;