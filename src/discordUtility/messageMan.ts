import { TextChannel, Message, DMChannel, MessageReaction, MessageEmbed } from "discord.js";
import { errorHandler } from "../structures/ErrorHandler";

// Sends a message in a channel, but has generic error handling so it doesn't have to be repeated 1,000,000 times throughout code
export async function betterSend(channel: TextChannel | DMChannel, content: string | MessageEmbed, lifetime?: number): Promise<Message | undefined> {
    let message: Message;
    try {
        if (typeof content == "string") {
            message = await channel.send(content);
        }
        else {
            message = await channel.send({ embeds: [content] })
        }
    }
    catch (error) {
        return;
    }

    if (lifetime) {
        setTimeout(() => {
            safeDeleteMessage(message);
        }, lifetime);
    }

    return message;
}

// Deletes a message if the bot is able to do that
export function safeDeleteMessage(message: Message | undefined): boolean {
    if (!message) {
        return false;
    }
    
    if (!message.deletable) {
        return false;
    }
    // At this point, the bot should be able to delete the message

    try {
        message.delete();
    }
    catch (error) {
        errorHandler.handleError(error as Error, "There was an error deleting a message.");
        return false;
    }

    return true;
}

export async function safeReact(message: Message, emoji: string): Promise<undefined | MessageReaction> {
    if (message.deleted) {
        return;
    }

    return message.react(emoji);
}

export async function safeEdit(message: Message, content: string | MessageEmbed): Promise<undefined | Message> {
    if (message.deleted) {
        return;
    }

    if (!message.editable) {
        return;
    }

    let editedMessage: Message;
    try {
        if (typeof content == "string") {
            editedMessage = await message.edit(content);
        }
        else {
            editedMessage = await message.edit({ embeds: [content] })
        }
    }
    catch (error) {
        return;
    }

    return editedMessage;
}