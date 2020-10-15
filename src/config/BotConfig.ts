// A type that represents the bot's currently used prefix
type BotConfig = {
    prefix: string,
    capturePeriod: number
};

// The bot's currently used global prefix
const config: BotConfig = {
    prefix: "b/",
    capturePeriod: 3 * 60 * 60 * 1000
};

export default config;