import { DMChannel, NewsChannel, TextChannel } from "discord.js";
import UserError from "../structures/userError";
import { betterSend } from "./messageMan";

export default function handleUserError(channel: TextChannel | DMChannel | NewsChannel, error: Error): void {
    if (error instanceof UserError) {
        betterSend(channel, 'Error: ' + error.message, 10000);
    }
    else {
        throw error;
    }
}