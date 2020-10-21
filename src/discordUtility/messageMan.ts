import { TextChannel, Message, DMChannel, APIMessage } from "discord.js";
import { errorHandler } from "../structures/ErrorHandler";

// Sends a message in a channel, but has generic error handling so it doesn't have to be repeated 1,000,000 times throughout code.
export async function betterSend(channel: TextChannel | DMChannel, content: string | APIMessage, lifetime?: number): Promise<Message | undefined> {
    // Send the message and handle errors
    let message: Message;
    try {
        message = await channel.send(content);
    }
    catch (error) {
        errorHandler.handleError(error, "There was an error sending a message.");
        return;
    }

    // If a lifetime amount was given, try to delete the message eventually
    if (lifetime) {
        setTimeout(() => {
            safeDeleteMessage(message);
        }, lifetime);
    }

    return message;
}

// Deletes a message if the bot is able to do that
export function safeDeleteMessage(message: Message | undefined): boolean {
    // If no message was provided
    if (!message) {
        return false;
    }
    
    // If the bot can't delete the message
    if (!message.deletable) {
        return false;
    }
    // At this point, the bot should be able to delete the message

    // Delete the message
    try {
        message.delete();
    }
    catch (error) {
        errorHandler.handleError(error, "There was an error deleting a message.");
        return false;
    }

    return true;
}
