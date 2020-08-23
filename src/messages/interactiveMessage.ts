import { Message, MessageReaction, PartialUser, User, TextChannel, APIMessage, DMChannel, MessageEmbed } from 'discord.js';

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

            // If the reaction added to the message isn't an active button on that message
            if (!interactiveMessage.buttonIsActive(emojiString)) {
                // Don't do anything with the reaction
                return;
            }
            // If we're down here it means the reaction added was a valid button

            try {
                // Activate the message's button that corresponds to the emoji reacted with
                await interactiveMessage.buttonPress(emojiString, user);
            }
            catch (error) {
                console.error('Error activating an interactive message\'s button.', error);
            }
        }
    }

    // Adds an existing interactive message to the global collection of them
    static addMessage(interactiveMessage: InteractiveMessage): void {
        // Get the interactive message's underlying message
        const discordMessage = interactiveMessage.getMessage();
        // Only add the message to the map of active messages if its message has been sent
        discordMessage && this.messages.set(discordMessage.id, interactiveMessage);
    }

    // Removes an interactive message from the global collection
    static removeMessage(interactiveMessage: InteractiveMessage): void {
        // Get the interactive message's underlying message
        const discordMessage = interactiveMessage.getMessage();
        // Only attempt to delete the message from the map of active messages if its message has been send
        discordMessage && this.messages.delete(discordMessage.id);
    }
}

interface EmojiButton {
    name: string
    emoji: string,
    disabled?: boolean,
    helpMessage?: string
}

// A message with pressable reaction buttons
// I wrote this before I knew about awaitReactions, so there's a static InteractiveMessageHandler class that sits in the main file and sends reactions to the right places.
// I considered re-writing this without that class, but awaitReaction doesn't (to my knowledge) provide me with the same level of control that this method does.
// If there are any serious concerns about this way of handling message reactions, I'd love to hear about it.
export class InteractiveMessage {
    // The text channel that the message will be sent in
    protected readonly channel: TextChannel | DMChannel;
    // The content of the message to display on the message
    private content: APIMessage | undefined;

    // The set of emojis that will serve as buttons on this message
    // The name property of each button ends up getting repeated in the string field and I'm not sorry about it
    private readonly buttons: Map<string, EmojiButton>;

    // This interactive message's underlying message
    private message: Message | undefined;
    
    // The number of milliseconds that this message will be active for
    private readonly lifetime: number;
    // Whether or not pressing a button will reset this message's deactivation timer
    private readonly resetTimerOnButtonPress: boolean;
    // The timer instance that will keep track of when this message should deactivate
    private timer: NodeJS.Timeout | undefined;

    constructor(
        channel: TextChannel | DMChannel,
        options?: {
            content?: APIMessage,
            buttons?: EmojiButton | EmojiButton[],
            lifetime?: number,
            resetTimerOnButtonPress?: boolean
        }
    ){
        // Assign channel
        this.channel = channel;
        
        // Default values for properties that can be overloaded with options
        this.buttons = new Map();

        this.lifetime = 60000;
        this.resetTimerOnButtonPress = true;

        // If an options object was provided
        if (options) {
            // Assign content
            this.content = options.content;

            // If buttons were provided
            if (options.buttons) {
                // If it's just one button
                if (!Array.isArray(options.buttons)) {
                    // Add the button by its given information
                    this.buttons.set(options.buttons.name, options.buttons);
                }
                // If it's an array of buttons
                else {
                    // Iterate over every button provided
                    options.buttons.forEach(button => {
                        // Add each button with its respective information
                        this.buttons.set(button.name, button);
                    });
                }
            }

            // Assign options fields if present
            if (options.lifetime) {
                this.lifetime = options.lifetime;
            }

            if (options.resetTimerOnButtonPress) {
                this.resetTimerOnButtonPress = options.resetTimerOnButtonPress;
            }
        }
    }

    // Sets the content of the message and edits it (if possible)
    protected async setEmbed(newEmbed: MessageEmbed): Promise<void> {
        // Assign the message's new content
        this.content = new APIMessage(this.channel, { embed: newEmbed });

        const message = this.message;
        // If the message has been sent, edit it to reflect the changes
        message && message.edit(newEmbed);
    }

    // Get the array of button emojis that are currently active (valid) on this message
    getActiveButtonEmojis(): string[] {
        const activeButtons = [];
        for (const button of this.buttons.values()) {
            if (!button.disabled) {
                activeButtons.push(button.emoji);
            }
        }
        return activeButtons;
    }

    // Checks if the message already has a button with a given name or emoji (making the given info ineligable for addition)
    hasSimilarButton(button: EmojiButton): boolean {
        let contained = false;
        this.buttons.forEach((info, name) => {
            if (name === button.name || info.emoji === button.emoji) {
                contained = true;
                return;
            }
        });
        return contained;
    }

    // Adds a new button to the message
    // Because of how Discord works, buttons cannot be visually removed after being added
    async addButton(button: EmojiButton): Promise<void> {
        // If the button is already on the message
        if (this.hasSimilarButton(button)) {
            throw new Error('Attempted to add a button to an interactive message that already existed.');
        }

        // Add the button to the map
        this.buttons.set(button.name, button);

        const message = this.getMessage();
        // Only react to the message if it exists (otherwise the new button will be added upon the message being sent)
        message && message.react(button.emoji);
    }

    // Removes a button from this message's list of active buttons
    // Doesn't visually remove the button (sorry, I really can't do anything about this)
    removeButton(buttonName: string): void {
        // If the button doesn't exist in the map of active buttons
        if (!this.buttons.has(buttonName)) {
            // Don't try to remove it
            return;
        }
        this.buttons.delete(button);
    }

    // Returns whether or not a given button is both on this message, and active
    buttonIsActive(button: string): boolean {
        const buttonInMap = this.buttons.get(button);
        if (!buttonInMap) {
            return false;
        }

        return buttonInMap.enabled;
    }

    // Enables a given button on the message (button must already exist on message, use addButton if it doesn't)
    enableButton(button: string): void {
        const buttonInMap = this.buttons.get(button);
        if (buttonInMap) {
            buttonInMap.enabled = true;
        }
    }

    // Disables a given button on the message
    disableButton(button: string): void {
        const buttonInMap = this.buttons.get(button);
        if (buttonInMap) {
            buttonInMap.enabled = false;
        }
    }

    getMessage(): Message | undefined { return this.message; }

    // Gets a formatted string of all available help information for every button currently active on the message
    getButtonHelpString(): string {
        let helpString = '';
        for (const [button, buttonHelp] of this.buttons.entries()) {
            // If the button is active, add the current button's help information if there is one
            helpString += buttonHelp.enabled && buttonHelp.helpMessage ? `${button}: ${buttonHelp.helpMessage} ` : '';
        }
        return helpString;
    }

    // Initially sets this message's timer for automatic deactivation
    private setTimer(): NodeJS.Timer {
        // Set the message's deactivation timer and return the resulting timer instance
        return setTimeout(() => {
            try {
                this.deactivate();
            }
            catch (error) {
                console.error('Error trying to deactivate an interactive message.', error);
            }
        }, this.lifetime);
    }

    // Send this interactive message, build it, and activate it
    async send(): Promise<void> {
        // If the message hasn't had its content initialized
        if (!this.content) {
            throw new Error('Tried to send an interactive message with no content');
        }

        // Send the interactive message's base message
        this.message = await betterSend(this.channel, this.content);

        // Get the message that was just sent
        const message = this.getMessage();

        // If nothing came back
        if (!message) {
            throw new Error('Error sending the base message for an interactive message.');
        }
        
        // Add this message to the map of other interactive messages
        InteractiveMessageHandler.addMessage(this);

        // Iterate over every button's emoji
        for await (const emoji of this.buttons.keys()) {
            try {
                // Add a reaction for every button
                await message.react(emoji);
            }
            catch (error) {
                throw new Error('Error trying to add reactions to an interactive message.');
            }
        }

        // After buttons have been added, start the message's timer
        this.timer = this.setTimer();
    }

    // Activates a button on this message
    async buttonPress(_button: string, _user: User | PartialUser): Promise<void> {
        // Resets the message's timer, if it's supposed to do that
        if (this.resetTimerOnButtonPress && this.timer) {
            clearTimeout(this.timer);
            this.timer = this.setTimer();
        }
    }

    // Deactivates the interactive message, freeing up space in the global list
    protected async deactivate(): Promise<void> {
        // If the timer was running, cancel it for good (preventing this method from being called again accidentally)
        this.timer && clearTimeout(this.timer);

        // Remove the message from the handler's list
        InteractiveMessageHandler.removeMessage(this);
    }
}