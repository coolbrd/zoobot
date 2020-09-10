import { Message, MessageReaction, PartialUser, User, TextChannel, APIMessage, DMChannel, MessageEmbed, RateLimitData, Client } from 'discord.js';

import { betterSend } from '../utility/toolbox';
import { EventEmitter } from 'events';

// A handler class for managing groups of InteractiveMessages
// I haven't found a reason to ever make more than one that's used throughout the entire bot... yet
// I'm using this instead of repeated awaitReactions calls because it gives me control over when users un-react as well as react
// I don't want users to have to press every button twice to get anything to happen
export class InteractiveMessageHandler {
    // The map of all interactive messages that this handler is managing
    private readonly messages = new Map<string, InteractiveMessage>();

    // Needs a Discord client instance so it can listen for events
    public constructor(client: Client) {
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

        // Check the map of interactive messages for a message with the id of the one reacted to
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
            console.error('Error activating an interactive message\'s button.', error);
        }
    }

    // Takes rate limit info, and applies a rate limit to an interactive message if necessary
    public handleRateLimit(info: RateLimitData): void {
        // If the rate limit is not for an edit operation on a message
        if (info.method !== 'patch' || !info.path.includes('messages')) {
            return;
        }
    
        // Get the message's id from the rate limit info (always the last 18 characters)
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

// The structure of an emoji reaction button that will be added to InteracticeMessage instance
interface EmojiButton {
    emoji: string,
    name: string,
    disabled?: boolean,
    helpMessage?: string
}

// A message with pressable reaction buttons
export class InteractiveMessage extends EventEmitter {
    // This message's handler class, responsible for sending the message button press actions
    private readonly handler: InteractiveMessageHandler;

    // The text channel that the message will be sent in
    // No news channels allowed, I hardly understand how those work
    protected readonly channel: TextChannel | DMChannel;
    // The content of the message (usually just has an embed)
    private content: APIMessage | undefined;

    // The set of emojis that will serve as buttons on this message
    // The emoji property of each button ends up getting repeated in the key and I'm not sorry about it
    private readonly buttons: Map<string, EmojiButton> = new Map();
    // More repetition here so I can easily get buttons by their name OR emoji
    private readonly buttonNames: Map<string, string> = new Map();

    // This interactive message's underlying Discord message
    // Will only be undefined before this message is sent
    private message: Message | undefined;
    // Whether or not the message has been sent
    private sent = false;
    // Whether or not the message can be edited (due to Discord rate limits)
    // This is mostly handled automatically by Discord.js, but I wanted to limit the control over messages that are rate limited
    private rateLimited = false;
    
    // The number of milliseconds that this message will be active for
    // This number is used as an inactivity cooldown that gets reset on each button press by default
    private readonly lifetime: number;
    // Whether or not pressing a button will reset this message's deactivation timer
    private readonly resetTimerOnButtonPress: boolean;
    // The timer instance that will keep track of when this message should deactivate
    private timer: NodeJS.Timeout | undefined;

    // Whether or not this message is deactivated
    protected deactivated = false;
    // The text to append to the footer of the message once it has been deactivated
    protected deactivationText = '(message deactivated)';

    constructor(
        handler: InteractiveMessageHandler,
        channel: TextChannel | DMChannel,
        options?: {
            content?: APIMessage,
            buttons?: EmojiButton | EmojiButton[],
            lifetime?: number,
            resetTimerOnButtonPress?: boolean,
            deactivationText?: string
        }
    ){
        // Do EventEmitter stuff
        super();

        // Assign this message's handler
        this.handler = handler;
        // Assign channel
        this.channel = channel;

        // Assign default values
        this.lifetime = 60000;
        this.resetTimerOnButtonPress = true;

        // If an options object was provided
        if (options) {
            // Assign content (even if none was provided, because it will still just be undefined)
            this.content = options.content;

            // If buttons were provided
            if (options.buttons) {
                // If it's just one button
                if (!Array.isArray(options.buttons)) {
                    // Add the button by its given information
                    this.addButton(options.buttons);
                }
                // If it's an array of buttons
                else {
                    // Iterate over every button provided
                    options.buttons.forEach(button => {
                        // Add each button with its respective information
                        this.addButton(button);
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

        // Update deactivation flag once the deactivate event is emitted
        this.once('deactivate', () => {
            this.deactivated = true;
        });
    }

    // Gets the Discord message from this interactive message
    // Only meant to be called when the message is known to be sent. Use isSent to verify this.
    public getMessage(): Message {
        if (!this.message) {
            throw new Error('Attempted to get the message of an interactive message that hasn\'t been sent yet');
        }

        return this.message;
    }

    // Whether or not the message has been sent
    public isSent(): boolean {
        return this.sent;
    }

    // Whether or not the message is currently rate limited
    public isRateLimited(): boolean {
        return this.rateLimited;
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

    // Sets the text that will appear at the bottom of the message on deactivation
    protected setDeactivationText(newText: string): void {
        this.deactivationText = newText;
    }

    // Sends the message and adds its necessary reaction buttons
    private async sendAndBuild(): Promise<void> {
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
        this.handler.addMessage(this);

        // Iterate over every button's emoji
        for (const button of this.buttons.values()) {
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

    // The method for sending this message once it's ready
    public async send(): Promise<void> {
        // If the message is already prepared for sending
        if (this.readyToSend()) {
            // Send the message and build it
            this.sendAndBuild();
        }
        // If the message isn't yet prepared to send
        else {
            // Assign a one-time listener that will send the message once it's been indicated as ready
            this.once('readyToSend', async () => {
                // Make sure this event hasn't been emitted prematurely
                if (!this.readyToSend()) {
                    throw new Error('readyToSend event emitted before message is actually ready to send.');
                }
                // Send and build the message now that it's actually ready for that
                this.sendAndBuild();
            });
        }
    }

    // Whether or not the message is prepared to be sent
    private readyToSend(): boolean {
        // Return false if the message has no content yet
        return this.content ? true : false;
    }

    // Sets the embed of the message and edits it (if possible)
    protected async setEmbed(newEmbed: MessageEmbed): Promise<void> {
        // Don't allow changes to the message if it's deactivated
        if (this.deactivated) {
            return;
        }

        // Assign the message's new embed
        const newContent = new APIMessage(this.channel, { embed: newEmbed });

        // Don't edit the message if the rate limit has been hit
        if (this.rateLimited) {
            return;
        }

        this.content = newContent
        // If this instance's message has been sent, edit it to reflect the changes
        this.isSent() && this.getMessage().edit(this.content);
    }

    // Checks if the message already has a button with a given name or emoji (making the given info ineligable for addition)
    private hasSimilarButton(button: EmojiButton): boolean {
        let contained = false;
        this.buttons.forEach(currentButton => {
            // If the new button shares a name of emoji with any existing button
            if (currentButton.emoji === button.emoji || currentButton.name === button.emoji) {
                contained = true;
                return;
            }
        });
        return contained;
    }

    // Get the array of button emojis that are currently active (valid) on this message
    public getActiveButtonEmojis(): string[] {
        const activeButtons = [];
        for (const button of this.buttons.values()) {
            if (!button.disabled) {
                activeButtons.push(button.emoji);
            }
        }
        return activeButtons;
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
        // Find the button with that name and enable it
        this.getButtonByName(buttonName).disabled = false;
    }

    // Disables a given button on the message, keeping it on the message but temporarily removing its functionality
    protected disableButton(buttonName: string): void {
        // Find a button with that name and disable it
        this.getButtonByName(buttonName).disabled = true;
    }

    // Updates a button's help message to a given string
    protected setButtonHelpMessage(buttonName: string, newMessage: string): void {
        // Find a button with that name and change its help message
        this.getButtonByName(buttonName).helpMessage = newMessage;
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

    // Presses a button based on its emoji
    public emojiPress(emoji: string, user: User): void {
        this.buttonPress(this.getButtonByEmoji(emoji).name, user);
    }

    // Activates a button on this message by the button's name
    protected buttonPress(_button: string, _user: User): void {
        // If this message's timer is supposed to be reset with every button press, and the timer is running
        if (this.resetTimerOnButtonPress && this.timer) {
            // Reset the timer
            clearTimeout(this.timer);
            this.timer = this.setTimer();
        }
    }

    // When the message's timer expires
    private timeExpired(): void {
        // Indicate that the timer has expired
        this.emit('timeExpired');
        // Deactivate the message
        this.deactivate();
    }

    // Deactivates the interactive message, removing it from the handler's map and disabling this message's buttons
    protected deactivate(): void {
        // Get the underlying message for use in deactivation logic
        const message = this.getMessage();

        // If the message is sent, it has an embed, and it has deactivation text to add
        if (this.isSent() && message.embeds && this.deactivationText) {
            // Get the displayed embed of the message
            const embed = message.embeds[0];
            // Get the embed's footer as it currently is
            const currentFooter = embed.footer;

            let newFooter: string;
            // If the embed already has footer text
            if (currentFooter) {
                // Append the deactivation text to the bottom of the footer
                newFooter = currentFooter.text + `\n${this.deactivationText}`
            }
            // If there's no preexisting footer text
            else {
                // Just use the deactivation text on its own
                newFooter = this.deactivationText;
            }

            // Update the embed's footer
            embed.setFooter(newFooter);
            // Update the message's embed
            this.setEmbed(embed);
        }

        // Indicate that this message has been deactivated
        this.emit('deactivate');

        // If the timer was running, cancel it for good (preventing this method from being called again accidentally)
        this.timer && clearTimeout(this.timer);

        // Remove the message from the handler's list
        this.handler.removeMessage(this);
    }

    // Applies a rate limit to the message, preventing it from being edited until the limit expires
    public applyRateLimit(timeout: number): void {
        // Indicate that this message is rate limited
        this.rateLimited = true;

        // Reverse the flag after the given timeout
        setTimeout(() => {
           this.rateLimited = false; 
        }, timeout);
    }
}