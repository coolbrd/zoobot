import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export const DISCORD_TOKEN = process.env.token as string;
export const MONGODB_PATH = process.env.mongopath as string;
export const ADMIN_SERVER_ID = process.env.adminserverid as string;
export const EMOJI_SERVER_ID = process.env.emojiserverid as string;
export const FEEDBACK_CHANNEL_ID = process.env.feedbackchannelid as string;
export const DEVELOPER_ID = process.env.developerid as string;
export const IBL_WEB_AUTH = process.env.IBLwebAuth as string;
export const WEBSERVER_PORT = Number(process.env.webserverPort as string);
export const DBL_WEB_AUTH = process.env.DBLwebAuth as string;

if (!DISCORD_TOKEN || !MONGODB_PATH || !ADMIN_SERVER_ID || !DEVELOPER_ID || !IBL_WEB_AUTH || !WEBSERVER_PORT || !DBL_WEB_AUTH) {
    throw new Error("One or more environment variables failed to load.");
}