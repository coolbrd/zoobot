import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export const DISCORD_TOKEN = process.env.token as string;
export const MONGODB_PATH = process.env.mongopath as string;
export const ADMIN_SERVER_ID = process.env.adminserverid as string;
export const EMOJI_SERVER_ID = process.env.emojiserverid as string;
export const FEEDBACK_CHANNEL_ID = process.env.feedbackchannelid as string;
export const DEVELOPER_ID = process.env.developerid as string;
export const IBLwebAuth = process.env.IBLwebAuth as string;
export const webserverPort = Number(process.env.webserverPort as string);

if (!DISCORD_TOKEN || !MONGODB_PATH || !ADMIN_SERVER_ID || !DEVELOPER_ID || !IBLwebAuth || !webserverPort) {
    throw new Error("One or more environment variables failed to load.");
}