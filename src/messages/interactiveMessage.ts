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

// A message with pressable reaction buttons
// I wrote this before I knew about awaitReactions, so there's a static InteractiveMessageHandler class that sits in the main file and sends reactions to the right places.
// I considered re-writing this without that class, but awaitReaction doesn't (to my knowledge) provide me with the same level of control that this method does.
// If there are any serious concerns about this way of handling message reactions, I'd love to hear about it.
export class InteractiveMessage {
    // The text channel that the message will be sent in
    private readonly channel: TextChannel | DMChannel;
    // The content of the message to display on the message
    private content: APIMessage | undefined;

    // The set of emojis that will serve as buttons on this message
    private readonly buttons: { [button: string]: string | undefined };

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
            buttons?: string[] | { [button: string]: string | undefined },
            lifetime?: number,
            resetTimerOnButtonPress?: boolean
        }
    ){
        // Assign channel
        this.channel = channel;
        
        // Default values for properties that can be overloaded with options
        this.buttons = {};

        this.lifetime = 60000;
        this.resetTimerOnButtonPress = true;

        // If an options object was provided
        if (options) {
            // Assign content
            this.content = options.content;

            // If buttons were provided
            if (options.buttons) {
                // If a string of anonymous buttons was provided instead of an object with help messages
                if (Array.isArray(options.buttons)) {
                    // Initialize an empty object that will contain each button provided
                    const buttonsObject: { [button: string]: string | undefined } = {};
                    // Iterate over every button provided
                    options.buttons.forEach(button => {
                        // Add a property with an empty help message for the current button
                        Object.defineProperty(buttonsObject, button, {
                            value: undefined,
                            writable: false,
                            enumerable: true
                        });
                    });
                    this.buttons = buttonsObject;
                }
                // If the buttons parameter is already an object
                else {
                    // Assign it as-is
                    this.buttons = options.buttons;
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

    // Get an array of every button currently on the message
    getButtons(): string[] {
        return Object.keys(this.buttons);
    }

    // Adds a new button to the message
    // Because of how Discord works, buttons cannot be visually removed after being added
    async addButton(button: string, helpMessage?: string): Promise<void> {
        // Don't do anything if the button is already on the message
        if (button in this.buttons) {
            return;
        }

        // Add the button to the buttons object
        Object.defineProperty(this.buttons, button, {
            value: helpMessage,
            writable: false,
            enumerable: true
        });

        const message = this.getMessage();
        // Only react to the message if it exists (otherwise the new button will be added upon the message being sent)
        message && message.react(button);
    }

    // Removes a button from this message's list of active buttons
    // Doesn't visually remove the button (sorry!)
    async removeButton(button: string): Promise<void> {
        // If the button doesn't exist in the list of active buttons
        if (!(button in this.buttons)) {
            // Don't try to remove it
            return;
        }
        // Remove the given button from the object
        delete this.buttons[button];
    }

    getMessage(): Message | undefined { return this.message; }

    // Gets a formatted string of all available help information for every button currently active on the message
    getButtonHelpString(): string {
        let helpString = ``;
        for (const [button, buttonHelp] of Object.entries(this.buttons)) {
            // Add the current button's help information, if there is any
            helpString += buttonHelp ? `${button}: ${buttonHelp} ` : ``;
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
                console.error(`Error trying to deactivate an interactive message.`, error);
            }
        }, this.lifetime);
    }

    // Resets this message's deactivation timer
    private resetTimer(): void {
        // If the timer is running, end it
        this.timer && clearTimeout(this.timer);
        // Set the timer
        this.timer = this.setTimer();
    }

    // Send this interactive message, build it, and activate it
    async send(): Promise<void> {
        // If the message hasn't had its content initialized
        if (!this.content) {
            throw new Error(`Tried to send an interactive message with no content`);
        }

        // Send the interactive message's base message
        this.message = await betterSend(this.channel, this.content);

        // Get the message that was just sent
        const message = this.getMessage();

        // If nothing came back
        if (!message) {
            throw new Error(`Error sending the base message for an interactive message.`);
        }

        // Determine the linear array of buttons to loop over
        const buttonArray = Array.isArray(this.buttons) ? this.buttons : Object.keys(this.buttons);
        
        // Add this message to the map of other interactive messages
        InteractiveMessageHandler.addMessage(this);

        // Iterate over every button's emoji
        for await (const emoji of buttonArray) {
            try {
                // Add a reaction for every button
                await message.react(emoji);
            }
            catch (error) {
                throw new Error(`Error trying to add reactions to an interactive message.`);
            }
        }

        // After buttons have been added, start the message's timer
        this.timer = this.setTimer();
    }

    // Activates a button on this message
    async buttonPress(_button: string, _user: User | PartialUser): Promise<void> {
        // Resets the message's timer if it's supposed to do that
        this.resetTimerOnButtonPress && this.resetTimer();
    }

    // Deactivates the interactive message, freeing up space in the global list
    protected async deactivate(): Promise<void> {
        // If the timer was running, cancel it for good (preventing this method from being called again accidentally)
        this.timer && clearTimeout(this.timer);

        // Remove the message from the handler's list
        InteractiveMessageHandler.removeMessage(this);
    }
}