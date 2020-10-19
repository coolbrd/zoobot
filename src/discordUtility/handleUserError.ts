import { DMChannel, NewsChannel, TextChannel } from "discord.js";
import UserError from "../structures/UserError";
import { betterSend } from "./messageMan";

// Handles an error that could potentially be a user error, requiring display to the user
export default function handleUserError(channel: TextChannel | DMChannel | NewsChannel, error: Error): Error | undefined {
    if (error instanceof UserError) {
        betterSend(channel, "Error: " + error.message, 10000);
        return;
    }
    else {
        return error;
    }
}