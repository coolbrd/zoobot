import { Message, MessageReaction, PartialUser, User, TextChannel, APIMessage, DMChannel, MessageEmbed } from 'discord.js';

import { betterSend } from '../utility/toolbox';
import { EventEmitter } from 'events';

// The static bot-wide handler for interactive messages
// I'm using this instead of repeated awaitReactions calls because it gives me control over when users un-react as well as react.
// I don't want users to have to press every button twice to get anything to happen
export class InteractiveMessageHandler {
    // The shared list of every active interactive message to handle
    private static readonly messages = new Map<string, InteractiveMessage>();

    // Takes a user's message reaction and potentially activates an interactive message
    public static async handleReaction(messageReaction: MessageReaction, user: User | PartialUser): Promise<undefined> {
        // If the user who reacted to something is a bot, or not a complete user
        if (user.bot || user.partial) {
            // Ignore the reaction entirely
            // No bots allowed because buttons could be abused, and no partial users because they don't contain all necessary user info
            return;
        }

        // Check the map of interactive messages for a message with the id of the one reacted to
        const interactiveMessage = this.messages.get(messageReaction.message.id);

        // If no message was found, don't try to do anything else
        if (!interactiveMessage) {
            return;
        }

        // Get the emoji that was used to react
        const emojiString = messageReaction.emoji.toString();

        // If the reaction added to the message isn't an active button on that message
        if (!interactiveMessage.getActiveButtonEmojis().includes(emojiString)) {
            // Don't do anything with the reaction
            return;
        }
        // If we're down here it means the reaction added was a valid button

        try {
            // Activate the message's button that corresponds to the emoji reacted with
            interactiveMessage.emojiPress(emojiString, user);
        }
        catch (error) {
            console.error('Error activating an interactive message\'s button.', error);
        }
    }

    // Adds an existing interactive message to the global collection of them
    public static addMessage(interactiveMessage: InteractiveMessage): void {
        // Only add the message to the map of active messages if its message has been sent
        interactiveMessage.isSent() && this.messages.set(interactiveMessage.getMessage().id, interactiveMessage);
    }

    // Removes an interactive message from the global collection
    public static removeMessage(interactiveMessage: InteractiveMessage): void {
        // Only attempt to delete the message from the map of active messages if its message has been send
        interactiveMessage.isSent() && this.messages.delete(interactiveMessage.getMessage().id);
    }
}

// The structure of an emoji reaction button that will be added to InteracticeMessage instanced
interface EmojiButton {
    emoji: string,
    name: string,
    disabled?: boolean,
    helpMessage?: string
}

// A message with pressable reaction buttons
// I wrote this before I knew about awaitReactions, so there's a static InteractiveMessageHandler class that sits in the main file and sends reactions to the right places.
// I considered re-writing this without that class, but awaitReaction doesn't (to my knowledge) provide me with the same level of control that this method does.
// If there are any serious concerns about this way of handling message reactions, I'd love to hear about it.
export class InteractiveMessage extends EventEmitter {
    // The text channel that the message will be sent in
    protected readonly channel: TextChannel | DMChannel;
    // The content of the message to display on the message
    private content: APIMessage | undefined;

    // The set of emojis that will serve as buttons on this message
    // The emoji property of each button ends up getting repeated in the key and I'm not sorry about it
    private readonly buttons: Map<string, EmojiButton>;
    // More repetition here so I can easily get buttons by their name OR emoji
    private readonly buttonNames: Map<string, string>;

    // This interactive message's underlying message
    // Will only be undefined before this message is sent
    private message: Message | undefined;
    // Whether or not the message has been sent
    private sent = false;
    
    // The number of milliseconds that this message will be active for
    // This number is used as an inactivity cooldown that gets reset on each button press by default
    private readonly lifetime: number;
    // Whether or not pressing a button will reset this message's deactivation timer
    private readonly resetTimerOnButtonPress: boolean;
    // The timer instance that will keep track of when this message should deactivate
    private timer: NodeJS.Timeout | undefined;

    // Whether or not this message is deactivated
    protected deactivated = false;
    // The text to append, to the footer of the message once it has been deactivated
    protected deactivationText: string;

    constructor(
        channel: TextChannel | DMChannel,
        options?: {
            content?: APIMessage,
            buttons?: EmojiButton | EmojiButton[],
            lifetime?: number,
            resetTimerOnButtonPress?: boolean,
            deactivationText?: string
        }
    ){
        super();

        // Assign channel
        this.channel = channel;
        
        // Default values for properties that can be overloaded with options
        this.buttons = new Map();
        this.buttonNames = new Map();

        this.lifetime = 60000;
        this.resetTimerOnButtonPress = true;

        this.deactivationText = '(message deactivated)';

        // If an options object was provided
        if (options) {
            // Assign content
            this.content = options.content;

            // If buttons were provided
            if (options.buttons) {
                // If it's just one button
                if (!Array.isArray(options.buttons)) {
                    // Add the button by its given information
                    this.buttons.set(options.buttons.emoji, options.buttons);
                    this.buttonNames.set(options.buttons.name, options.buttons.emoji);
                }
                // If it's an array of buttons
                else {
                    // Iterate over every button provided
                    options.buttons.forEach(button => {
                        // Add each button with its respective information
                        this.buttons.set(button.emoji, button);
                        this.buttonNames.set(button.name, button.emoji);
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

            if (options.deactivationText) {
                this.deactivationText = options.deactivationText;
            }
        }
    }

    // Sets the embed of the message and edits it (if possible)
    protected async setEmbed(newEmbed: MessageEmbed): Promise<void> {
        // Don't allow changes to the message if it's deactivated
        if (this.deactivated) {
            return;
        }

        // Assign the message's new embed
        this.content = new APIMessage(this.channel, { embed: newEmbed });

        // If this instance's message has been sent, edit it to reflect the changes
        this.message && this.message.edit(newEmbed);
    }

    protected setDeactivationText(newText: string): void {
        this.deactivationText = newText;
    }

    // Gets a button's emoji by its name
    protected getEmojiByName(buttonName: string): string {
        const targetEmoji = this.buttonNames.get(buttonName);

        if (!targetEmoji) {
            throw new Error('Couldn\'t find an emoji in a map of button names by a given name.');
        }

        return targetEmoji;
    }

    // Gets a button by its emoji
    protected getButtonByEmoji(emoji: string): EmojiButton {
        const targetButton = this.buttons.get(emoji);

        if (!targetButton) {
            throw new Error('Couldn\'t find a button in a map of buttons by a given emoji.');
        }

        return targetButton;
    }

    // Gets a button by its name
    protected getButtonByName(buttonName: string): EmojiButton {
        const targetEmoji = this.getEmojiByName(buttonName);

        return this.getButtonByEmoji(targetEmoji);
    }

    // Get the array of button emojis that are currently active (valid) on this message
    // Used when a user reacts and the handler needs to see if their reaction was a button that should do something
    public getActiveButtonEmojis(): string[] {
        const activeButtons = [];
        for (const button of this.buttons.values()) {
            if (!button.disabled) {
                activeButtons.push(button.emoji);
            }
        }
        return activeButtons;
    }

    // Checks if the message already has a button with a given name or emoji (making the given info ineligable for addition)
    private hasSimilarButton(button: EmojiButton): boolean {
        let contained = false;
        this.buttons.forEach(currentButton => {
            if (currentButton.emoji === button.emoji || currentButton.name === button.emoji) {
                contained = true;
                return;
            }
        });
        return contained;
    }

    // Adds a new button to the message
    // Because of how Discord works, buttons cannot be visually removed after being added
    protected addButton(button: EmojiButton): void {
        // If the button is already on the message
        if (this.hasSimilarButton(button)) {
            throw new Error('Attempted to add a button to an interactive message that already existed.');
        }

        // Add the button to the map
        this.buttons.set(button.emoji, button);
        this.buttonNames.set(button.name, button.emoji);

        // Only react to the message if it exists (otherwise the new button will be added upon the message being sent)
        this.message && this.message.react(button.emoji);
    }

    // Removes a button from this message's list of active buttons
    // Doesn't visually remove the button (sorry, I really can't do anything about this)
    protected removeButton(buttonName: string): void {
        // Remove both the button and its name association
        this.buttons.delete(this.getEmojiByName(buttonName));
        this.buttonNames.delete(buttonName);
    }

    // Enables a given button on the message (button must already exist on message, use addButton if it doesn't)
    protected enableButton(buttonName: string): void {
        const targetButton = this.getButtonByName(buttonName);

        targetButton.disabled = false;
    }

    // Disables a given button on the message, keeping it on the message but temporarily removing its functionality
    protected disableButton(buttonName: string): void {
        const targetButton = this.getButtonByName(buttonName);

        targetButton.disabled = true;
    }

    // Updates a button's help message to a given string
    protected setButtonHelpMessage(buttonName: string, newMessage: string): void {
        this.getButtonByName(buttonName).helpMessage = newMessage;
    }

    public isSent(): boolean {
        return this.sent;
    }

    public getMessage(): Message {
        if (!this.message) {
            throw new Error('Attempted to get the message of an interactive message that hasn\'t been sent yet');
        }

        return this.message;
    }

    // Gets a formatted string of all available help information for every button currently active on the message
    protected getButtonHelpString(): string {
        let helpString = '';
        for (const button of this.buttons.values()) {
            // If the button is active, add the current button's help information if there is one
            helpString += (!button.disabled && button.helpMessage) ? `${button.emoji}: ${button.helpMessage} ` : '';
        }
        return helpString;
    }

    // Initially sets this message's timer for automatic deactivation
    private setTimer(): NodeJS.Timer {
        // Set the message's deactivation timer and return the resulting timer instance
        return setTimeout(() => {
            this.timeExpired();
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

        // If nothing came back
        if (!this.message) {
            throw new Error('Error sending the base message for an interactive message.');
        }

        // If we're here it means that the message was successfully sent
        this.sent = true;

        // Add this message to the map of other interactive messages
        InteractiveMessageHandler.addMessage(this);

        // Iterate over every button's emoji
        for await (const button of this.buttons.values()) {
            try {
                // Add a reaction for every button
                await this.message.react(button.emoji);
            }
            catch (error) {
                throw new Error('Error trying to add reactions to an interactive message.');
            }
        }

        // After buttons have been added, start the message's timer
        this.timer = this.setTimer();
    }

    // Presses a button based on its emoji
    emojiPress(emoji: string, user: User): void {
        this.buttonPress(this.getButtonByEmoji(emoji).name, user);
    }

    // Activates a button on this message
    protected buttonPress(_button: string, _user: User): void {
        // Resets the message's timer, if it's supposed to do that
        if (this.resetTimerOnButtonPress && this.timer) {
            clearTimeout(this.timer);
            this.timer = this.setTimer();
        }
    }

    // When the message's timer expires
    private timeExpired(): void {
        this.emit('timeExpired');

        this.deactivate();
    }

    // Deactivates the interactive message, freeing up space in the global list of messages to handle
    protected deactivate(): void {
        if (this.deactivationText && this.message && this.message.embeds) {
            const embed = this.message.embeds[0];

            const currentFooter = embed.footer;

            let newFooter: string;
            if (currentFooter) {
                newFooter = currentFooter.text + `\n${this.deactivationText}`
            }
            else {
                newFooter = this.deactivationText;
            }

            embed.setFooter(newFooter);

            this.setEmbed(embed);
        }

        // Indicate that this message is deactivated
        this.deactivated = true;

        // Tell whoever's listening that this message has been deactivated
        this.emit('deactivate');

        // If the timer was running, cancel it for good (preventing this method from being called again accidentally)
        this.timer && clearTimeout(this.timer);

        // Remove the message from the handler's list
        InteractiveMessageHandler.removeMessage(this);
    }
}