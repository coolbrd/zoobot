import { Client, MessageReaction, User, PartialUser, RateLimitData } from "discord.js";
import { errorHandler } from "../structures/ErrorHandler";

import InteractiveMessage from "./InteractiveMessage";

// A handler class for managing groups of InteractiveMessages
// I haven't found a reason to ever make more than one that's used throughout the entire bot... yet
// I'm using this instead of repeated awaitReactions calls because it gives me control over when users un-react as well as react
// I don't want users to have to press every button twice to get anything to happen
class InteractiveMessageHandler {
    // The map of all interactive messages that this handler is managing
    private readonly messages = new Map<string, InteractiveMessage>();

    public init(client: Client): void {
        // When the client observes a user adding a reaction to a message
        client.on('messageReactionAdd', (messageReaction, user) => {
            // Handle the user's reaction
            this.handleReaction(messageReaction, user);
        });

        // When the client observes a user removing a reaction from a message
        client.on('messageReactionRemove', (messageReaction, user) => {
            // Handle the user's reaction (same as a reaction being added)
            this.handleReaction(messageReaction, user);
        });

        // When the client gets rate limited because something is happening too fast
        client.on('rateLimit', info => {
            // Handle the rate limit info (in the context of interactive messages)
            this.handleRateLimit(info);
        });
    }

    // Takes a user's message reaction and potentially activates an interactive message
    private async handleReaction(messageReaction: MessageReaction, user: User | PartialUser): Promise<void> {
        // If the user who reacted to something is a bot, or not a complete user
        if (user.bot || user.partial) {
            // Ignore the reaction entirely
            // No bots allowed because buttons could be abused, and no partial users because they don't contain all necessary user info
            return;
        }

        // Check the map of interactive messages for a message with the ID of the one reacted to
        const interactiveMessage = this.messages.get(messageReaction.message.id);

        // If no message was found, don't try to do anything else
        if (!interactiveMessage) {
            // This is going to happen a lot, considering most reactions presumably won't be on one of these special messages
            return;
        }

        // Get the emoji that was used to react
        const emojiString = messageReaction.emoji.toString();

        // If the reaction added to the message isn't an active button on the message
        if (!interactiveMessage.getActiveButtonEmojis().includes(emojiString)) {
            // Don't do anything with the reaction, either the button doesn't exist or its deactivated
            return;
        }
        // If we're down here it means the reaction added was a valid button

        // If the message is rate limited, don't apply the button press
        // This is to prevent bottlenecked messages from accepting input but not processing it until the limit is over
        if (interactiveMessage.isRateLimited()) {
            return;
        }

        try {
            // Activate the message's button that corresponds to the emoji reacted with
            interactiveMessage.emojiPress(emojiString, user);
        }
        catch (error) {
            errorHandler.handleError(error, 'Error activating an interactive message\'s button.');
        }
    }

    // Takes rate limit info, and applies a rate limit to an interactive message if necessary
    public handleRateLimit(info: RateLimitData): void {
        // If the rate limit is not for an edit operation on a message
        if (info.method !== 'patch' || !info.path.includes('messages')) {
            return;
        }
    
        // Get the message's ID from the rate limit info (always the last 18 characters)
        const id = info.path.slice(info.path.length - 18, info.path.length);

        // Check if that message is an interactive message
        const interactiveMessage = this.messages.get(id);

        // Don't do anything if the message isn't interactive
        if (!interactiveMessage) {
            return
        }

        // Apply the a rate limit for the given amount of time on the appropriate message
        interactiveMessage.applyRateLimit(info.timeout);
    }

    // Adds an existing interactive message to the global collection of them
    public addMessage(interactiveMessage: InteractiveMessage): void {
        this.messages.set(interactiveMessage.getMessage().id, interactiveMessage);
    }

    // Removes an interactive message from the global collection
    public removeMessage(interactiveMessage: InteractiveMessage): void {
        this.messages.delete(interactiveMessage.getMessage().id);
    }
}
export const interactiveMessageHandler = new InteractiveMessageHandler();