import { Message, MessageReaction, PartialUser, User, TextChannel, APIMessage, DMChannel } from 'discord.js';

import { betterSend } from '../utility/toolbox';

// The static bot-wide handler for interactive messages
// I'm using this instead of repeated awaitReactions calls because it gives me control over when users un-react as well as react.
// I don't want users to have to press every button twice to get anything to happen
export class InteractiveMessageHandler {
    // The shared list of every active interactive message to handle
    private static readonly messages = new Map<string, InteractiveMessage>();

    // Takes a user's message reaction and potentially activates an interactive message
    static async handleReaction(messageReaction: MessageReaction, user: User | PartialUser): Promise<undefined> {
        // If the user who reacted to something is a bot, or not a complete user instance
        if (user.bot || !(user instanceof User)) {
            // Ignore the reaction entirely
            return;
        }

        // Check the map of interactive messages for a message with the id of the one reacted to
        const possibleMessage = this.messages.get(messageReaction.message.id);
        // If a message was found
        if (possibleMessage) {
            // Cast the possible message as an interactive message
            const interactiveMessage = possibleMessage as InteractiveMessage;

            const emojiString = messageReaction.emoji.toString();

            // If the reaction added to the message isn't a button on that message
            if (!interactiveMessage.getButtons().includes(emojiString)) {
                // Don't do anything with the reaction
                return;
            }
            // If we're down here it means the reaction added was a valid button

            try {
                // Activate the message's button that corresponds to the emoji reacted with
                await interactiveMessage.buttonPress(emojiString, user);
            }
            catch (error) {
                console.error(`Error activating an interactive message's button.`, error);
            }
        }
    }

    // Adds an existing interactive message to the global collection of them
    static addMessage(message: InteractiveMessage): void {
        this.messages.set(message.getMessage().id, message);
    }

    // Removes an interactive message from the global collection
    static removeMessage(message: InteractiveMessage): void {
        this.messages.delete(message.getMessage().id);
    }
}

// A message with pressable reaction buttons
// I wrote this before I knew about awaitReactions, so there's a static InteractiveMessageHandler class that sits in the main file and sends reactions to the right places.
// I considered re-writing this without that class, but awaitReaction doesn't (to my knowledge) provide me with the same level of control that this method does.
// If there are any serious concerns about this way of handling message reactions, I'd love to hear about it.
export class InteractiveMessage {
    // The set of emojis that will serve as buttons on this message
    private readonly buttons: string[];
    // The timer instance that will keep track of when this message should deactivate
    private timer: NodeJS.Timeout;
    // The number of milliseconds that this message will be active for
    private readonly lifetime: number;
    // Whether or not pressing a button will reset this message's deactivation timer
    private readonly resetTimerOnButtonPress: boolean;

    // This interactive message's underlying message
    private readonly message: Message;

    // The protected constructor for internally creating an interactive message instance. Only to be called from within methods of the object.
    protected constructor(message: Message, buttons: string[], lifetime: number, resetTimerOnButtonPress = true) {
        this.buttons = buttons;
        this.message = message;
        this.lifetime = lifetime;
        this.resetTimerOnButtonPress = resetTimerOnButtonPress;

        this.timer = this.setTimer();

        // Add this message to the map of other interactive messages
        InteractiveMessageHandler.addMessage(this);
    }

    getButtons(): string[] { return this.buttons; }

    getMessage(): Message { return this.message; }

    // This class is missing a static init method, which would normally initialize the asynchronous building process and return a completed interactive message.
    // The implementation of the init method is left up to child classes, which might have different parameters and default values for initialization.
    // A simple init method would most likely look something like this, but again, I'm not adding one to this class because it's never meant to be initialized.
    /*
    static async init(channel: TextChannel, content: APIMEssage, buttons: string[], lifetime: number) {
        let message;
        try {
            message = await this.build(content, channel, buttons);
        }
        catch (error) {
            console.error(`Error trying to build the base message for an interactive message.`, error);
            return;
        }

        const interactiveMessage = new InteractiveMessage(buttons, message, lifetime);

        return interactiveMessage;
    }
    */
    // It should be noted that in subclass implementations of the init method, the constructor of the subclass should be called rather than that of InteractiveMessage.

    private setTimer(): NodeJS.Timer {
        // Set the message's deactivation timer and return the resulting timer instance
        return setTimeout(() => {
            try {
                this.deactivate();
            }
            catch (error) {
                console.error(`Error trying to deactivate an interactive message.`, error);
            }
        }, this.lifetime);
    }

    // Resets this message's deactivation timer
    private resetTimer(): void {
        clearTimeout(this.timer);
        this.timer = this.setTimer();
    }

    // Builder method for initializing an interactive message
    protected static async build(content: APIMessage, channel: TextChannel | DMChannel, buttons: string[]): Promise<Message> {
        const message = await betterSend(channel, content);

        if (!message) {
            throw new Error(`Error sending the base message for an interactive message.`);
        }

        // Iterate over every button's emoji
        for await (const emoji of buttons) {
            try {
                // Add a reaction for every button
                await message.react(emoji);
            }
            catch (error) {
                throw new Error(`Error trying to add reactions to an interactive message.`);
            }
        }

        // Return the resulting message once its reactions have been added
        return message;
    }

    // Activates a button on this message
    async buttonPress(_button: string, _user: User | PartialUser): Promise<void> {
        // Resets the message's timer if it's supposed to do that
        if (this.resetTimerOnButtonPress) {
            this.resetTimer();
        }
    }

    // Deactivates the interactive message, freeing up space in the global list
    protected async deactivate(): Promise<void> {
        // Cancel the deactivation timer (if deactivate was called manually)
        // Thankfully, this does nothing if the timeout that we're trying to clear has already expired
        clearTimeout(this.timer);

        // Remove the message from the handler's list
        InteractiveMessageHandler.removeMessage(this);

        // Attempt to remove all reactions from the message
        try {
            await this.getMessage().reactions.removeAll();
        }
        // If the reactions couldn't be removed (most likely a permissions issue)
        catch (error) {
            // Don't log any errors, continue as normal
            return;
        }
    }
}