import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export const DISCORD_TOKEN = process.env.token as string;
export const MONGODB_PATH = process.env.mongopath as string;
export const ADMIN_SERVER_ID = process.env.adminserverid as string;
export const EMOJI_SERVER_ID = process.env.emojiserverid as string;
export const FEEDBACK_CHANNEL_ID = process.env.feedbackchannelid as string;
export const DEVELOPER_ID = process.env.developerid as string;
export const WEBSERVER_PORT = Number(process.env.webserverPort as string);
export const CUSTOM_WEBHOOK_SECRET = process.env.customWebhookSecret as string;
export const VULTREX_WEBHOOK_TOKEN = process.env.vultrexWebhookToken as string;
export const IBL_TOKEN = process.env.IBLtoken as string;
export const DBL_TOKEN = process.env.DBLtoken as string;
export const VULTREX_TOKEN = process.env.vultrexToken as string;
export const DISCORD_BOATS_TOKEN = process.env.discordBoatsToken as string;

if (!DISCORD_TOKEN || !MONGODB_PATH || !ADMIN_SERVER_ID || !DEVELOPER_ID || !IBL_TOKEN || !CUSTOM_WEBHOOK_SECRET || !WEBSERVER_PORT || !DBL_TOKEN || !VULTREX_TOKEN || !VULTREX_WEBHOOK_TOKEN || !DISCORD_BOATS_TOKEN) {
    throw new Error("One or more environment variables failed to load.");
}