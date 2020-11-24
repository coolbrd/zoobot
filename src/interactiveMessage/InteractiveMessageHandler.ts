import { Client, MessageReaction, User, PartialUser, RateLimitData } from "discord.js";
import { betterSend } from "../discordUtility/messageMan";
import { errorHandler } from "../structures/ErrorHandler";
import InteractiveMessage from "./InteractiveMessage";

export default class InteractiveMessageHandler {
    // The map of all interactive messages that this handler is currently managing
    private readonly activeMessages = new Map<string, InteractiveMessage>();

    constructor(client: Client) {
        client.on("messageReactionAdd", (messageReaction, user) => {
            this.handleReaction(messageReaction, user);
        });

        client.on("messageReactionRemove", (messageReaction, user) => {
            this.handleReaction(messageReaction, user);
        });

        client.on("rateLimit", info => {
            this.handleRateLimit(info);
        });
    }

    private async handleReaction(messageReaction: MessageReaction, user: User | PartialUser): Promise<void> {
        if (user.bot || user.partial) {
            return;
        }

        const interactiveMessage = this.activeMessages.get(messageReaction.message.id);

        if (!interactiveMessage) {
            return;
        }

        const emojiString = messageReaction.emoji.toString();

        const messageHasEmojiButton = interactiveMessage.getActiveButtonEmojis().includes(emojiString);

        if (!messageHasEmojiButton) {
            return;
        }

        try {
            await interactiveMessage.pressButtonByEmojiAndRefresh(emojiString, user);
        }
        catch (error) {
            errorHandler.handleError(error, "Error activating an interactive message's button.");

            betterSend(interactiveMessage.channel, "There was a problem processing input for an interactive message. Please report this to the developer.");
        }
    }

    public handleRateLimit(info: RateLimitData): void {
        if (info.method !== "patch" || !info.path.includes("messages")) {
            return;
        }
    
        // Get the message's ID from the rate limit info (always the last 18 characters)
        const id = info.path.slice(info.path.length - 18, info.path.length);

        const interactiveMessage = this.activeMessages.get(id);

        if (!interactiveMessage) {
            return
        }

        interactiveMessage.applyRateLimit(info.timeout);
    }

    public addMessage(interactiveMessage: InteractiveMessage): void {
        this.activeMessages.set(interactiveMessage.message.id, interactiveMessage);
    }

    public removeMessage(interactiveMessage: InteractiveMessage): void {
        this.activeMessages.delete(interactiveMessage.message.id);
    }
}