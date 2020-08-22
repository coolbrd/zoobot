import dotenv from 'dotenv';

// Instruct dotenv to load variables from the .env file into the environment
dotenv.config({ path: '.env' });

// The bot's client token
export const DISCORD_TOKEN = process.env.token as string;

// The bot's MongoDB login path
export const MONGODB_PATH = process.env.mongopath as string;

// The admin server for configuring the bot
export const ADMIN_SERVER_ID = process.env.adminserverid as string;