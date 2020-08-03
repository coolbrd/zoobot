// The module responsible for loading all client secrets from environment variables
// Environment variables are loaded via the .env file in the root folder

// The module responsible for loading environment variables from a .env file
import dotenv from "dotenv";

// Instruct dotenv to load variables from the .env file into the environment
dotenv.config({ path: ".env" });

// Get the bot's client token from the environment and export it
export const DISCORD_TOKEN = process.env.token as string;

// Get the bot's MongoDB login path and export it
export const MONGODB_PATH = process.env.mongopath as string;

// If no token was found
if (!DISCORD_TOKEN) {
  console.error("No token provided in .env file.");
}