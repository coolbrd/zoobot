import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export const DISCORD_TOKEN = process.env.token as string;
export const IS_TEST_BRANCH = process.env.testbranch === "true" ? true : false;
export const MONGODB_PATH = process.env.mongopath as string;
export const ADMIN_SERVER_ID = process.env.adminserverid as string;
export const EMOJI_SERVER_ID = process.env.emojiserverid as string;
export const FEEDBACK_CHANNEL_ID = process.env.feedbackchannelid as string;
export const DEVELOPER_ID = process.env.developerid as string;
export const WEBSERVER_PORT = Number(process.env.webserverPort as string);
export const MAIN_CLIENT_ID = process.env.mainClientId as string;
export const CUSTOM_WEBHOOK_SECRET = process.env.customWebhookSecret as string;
export const IBL_TOKEN = process.env.IBLtoken as string;
export const DBL_TOKEN = process.env.DBLtoken as string;
export const DISCORD_BOATS_TOKEN = process.env.discordBoatsToken as string;
export const DISCORD_BOTS_TOKEN = process.env.discordBotsToken as string;
export const ARCANE_TOKEN = process.env.arcaneToken as string;
export const BLIST_TOKEN = process.env.BListToken as string;
export const TOP_GG_TOKEN = process.env.topGGtoken as string;
export const DISCORD_BOTS_GG_TOKEN = process.env.discordBotsGGtoken as string;

if (!DISCORD_TOKEN || !MONGODB_PATH || !ADMIN_SERVER_ID || !DEVELOPER_ID || !IBL_TOKEN || !CUSTOM_WEBHOOK_SECRET || !WEBSERVER_PORT || !MAIN_CLIENT_ID || !DBL_TOKEN || !DISCORD_BOATS_TOKEN || !DISCORD_BOTS_TOKEN || !ARCANE_TOKEN || !BLIST_TOKEN || !TOP_GG_TOKEN || !DISCORD_BOTS_GG_TOKEN) {
    throw new Error("One or more environment variables failed to load.");
}