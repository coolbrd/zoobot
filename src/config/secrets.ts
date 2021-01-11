import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export const DISCORD_TOKEN = process.env.token as string;
export const MONGODB_PATH = process.env.mongopath as string;
export const ADMIN_SERVER_ID = process.env.adminserverid as string;
export const EMOJI_SERVER_ID = process.env.emojiserverid as string;
export const FEEDBACK_CHANNEL_ID = process.env.feedbackchannelid as string;
export const DEVELOPER_ID = process.env.developerid as string;
export const IBL_TOKEN = process.env.IBLtoken as string;
export const IBL_WEBHOOK_SECRET = process.env.IBLwebhookSecret as string;
export const DBL_WEBHOOK_SECRET = process.env.DBLwebhookSecret as string;
export const WEBSERVER_PORT = Number(process.env.webserverPort as string);
export const DBL_WEB_AUTH = process.env.DBLwebAuth as string;
export const VULTREX_WEB_AUTH = process.env.vultrexWebAuth as string;
export const VULTREX_WEBHOOK_TOKEN = process.env.vultrexWebhookToken as string;

if (!DISCORD_TOKEN || !MONGODB_PATH || !ADMIN_SERVER_ID || !DEVELOPER_ID || !IBL_TOKEN || !IBL_WEBHOOK_SECRET || !DBL_WEBHOOK_SECRET || !WEBSERVER_PORT || !DBL_WEB_AUTH || !VULTREX_WEB_AUTH || !VULTREX_WEBHOOK_TOKEN) {
    throw new Error("One or more environment variables failed to load.");
}