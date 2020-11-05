import { DMChannel, TextChannel } from "discord.js";
import UserError from "../structures/UserError";
import { betterSend } from "./messageMan";

// Handles an error that could potentially be a user error, requiring display to the user
export default function handleUserError(channel: TextChannel | DMChannel, error: Error, lifetime?: number): Error | undefined {
    if (error instanceof UserError) {
        betterSend(channel, error.message, lifetime);
        return;
    }
    else {
        throw error;
    }
}