import { EventEmitter } from "events";
import { Message, User, TextChannel, APIMessage, DMChannel, MessageEmbed } from "discord.js";
import { betterSend } from "../discordUtility/messageMan";
import { interactiveMessageHandler } from "./InteractiveMessageHandler";

// The structure of an emoji reaction button that will be added to InteracticeMessage instance
interface EmojiButton {
    emoji: string,
    name: string,
    disabled?: boolean,
    helpMessage?: string
}

// A message with pressable reaction buttons
export default abstract class InteractiveMessage extends EventEmitter {
    // The number of milliseconds that this message will be active for
    // This number is used as an inactivity cooldown that gets reset on each button press by default
    protected readonly abstract lifetime: number;

    // The method that uses this message's information in order to build its embed
    protected abstract async buildEmbed(): Promise<MessageEmbed>;

    // Whether or not pressing a button will reset this message's deactivation timer
    protected readonly resetTimerOnButtonPress = true;
    // The deactivation text that will be used if its not changed
    protected readonly defaultDeactivationText = "(message deactivated)";

    // The text channel that the message will be sent in
    // No news channels allowed
    public readonly channel: TextChannel | DMChannel;

    // The set of emojis that will serve as buttons on this message
    private readonly buttons: Map<string, EmojiButton> = new Map();
    // More repetition here so I can easily get buttons by their name OR emoji
    private readonly buttonNames: Map<string, string> = new Map();

    // This interactive message's underlying Discord message
    // Will only be undefined before this message is sent
    private _message: Message | undefined;
    // The content of the message (usually just has an embed)
    private _content: APIMessage | undefined;
    // Whether or not the message can be edited (due to Discord rate limits)
    // This is mostly handled automatically by Discord.js, but I wanted to limit the control over messages that are rate limited
    private _rateLimited = false;

    // The timer instance that will keep track of when this message should deactivate
    private _timer: NodeJS.Timeout | undefined;

    // Whether or not this message is deactivated
    private _deactivated = false;
    // The text to append to the footer of the message once it has been deactivated
    private _deactivationText = this.defaultDeactivationText;

    constructor(channel: TextChannel | DMChannel) {
        // Do EventEmitter stuff
        super();

        // Assign channel
        this.channel = channel;
    }

    private get content(): APIMessage | undefined {
        return this._content;
    }

    private set content(content: APIMessage | undefined) {
        if (this.sent && !content) {
            throw new Error("Attempted to set the content of a sent interactive message to nothing.");
        }

        this._content = content;
    }

    // Gets the Discord message from this interactive message
    // Only meant to be called when the message is known to be sent. Use isSent to verify this.
    public get message(): Message {
        if (!this._message) {
            throw new Error("Attempted to get the message of an interactive message that hasn't been sent yet");
        }

        return this._message;
    }

    private setMessage(message: Message): void {
        if (this._message) {
            throw new Error("Tried to set an interactive message to a message after it had already been sent.");
        }

        this._message = message;
    }

    private get sent(): boolean {
        return Boolean(this._message);
    }

    private get built(): boolean {
        return Boolean(this._content);
    }

    public get rateLimited(): boolean {
        return this._rateLimited;
    }

    private setRateLimited(rateLimited: boolean): void {
        this._rateLimited = rateLimited;
    }

    private get timer(): NodeJS.Timeout | undefined {
        return this._timer;
    }

    private set timer(timer: NodeJS.Timeout | undefined) {
        if (this.deactivated) {
            throw new Error("Tried to set an interactive message's timer after it was deactivated.");
        }

        this._timer = timer;
    }

    public get deactivated(): boolean {
        return this._deactivated;
    }

    private setDeactivated(): void {
        if (this._deactivated) {
            throw new Error("Tried to redundantly set an interactive message's deactivation status.");
        }

        this._deactivated = true;
    }

    private get deactivationText(): string {
        return this._deactivationText;
    }

    private set deactivationText(deactivationText: string) {
        this._deactivationText = deactivationText;
    }

    // Gets a button's emoji by its name
    protected getEmojiByName(buttonName: string): string {
        const targetEmoji = this.buttonNames.get(buttonName);

        if (!targetEmoji) {
            throw new Error("Couldn't find an emoji in a map of button names by a given name.");
        }

        return targetEmoji;
    }

    // Gets a button by its emoji
    protected getButtonByEmoji(emoji: string): EmojiButton {
        const targetButton = this.buttons.get(emoji);

        if (!targetButton) {
            throw new Error("Couldn't find a button in a map of buttons by a given emoji.");
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
    private async sendAndAddButtons(): Promise<void> {
        // If the message hasn't had its content initialized
        if (!this.content) {
            throw new Error("Tried to send an interactive message with no content");
        }

        // Send the base message
        const message = await betterSend(this.channel, this.content);

        if (!message) {
            throw new Error("An interactive message's message was unable to be sent.");
        }

        this.setMessage(message);

        // Add this message to the map of other interactive messages
        interactiveMessageHandler.addMessage(this);

        // Iterate over every button's emoji
        for (const button of this.buttons.values()) {
            try {
                // Add a reaction for every button
                await this.message.react(button.emoji);
            }
            catch (error) {
                throw new Error(`Error trying to add reactions to an interactive message: ${error}`);
            }
        }

        // After buttons have been added, start the message's timer
        this.timer = this.setTimer();
    }

    // Where any pre-send asynchonous building funcionality should go in subclasses
    public async build(): Promise<void> {
        return;
    }

    // Builds and sends the message
    public async send(): Promise<void> {
        // If the message hasn't been built, build it
        if (!this.built) {
            await this.build();
        }

        // Build the initial embed
        try {
            await this.refreshEmbed();
        }
        catch (error) {
            throw new Error(`There was an error initially building an interactive message's embed: ${error}`);
        }

        try {
            // Send the message and add its buttons
            await this.sendAndAddButtons();
        }
        catch (error) {
            throw new Error(`There was an error sending and adding buttons to an interactive message: ${error}`);
        }
    }

    // Sets the embed of the message and edits it (if possible)
    private setEmbed(newEmbed: MessageEmbed): void {
        // Don't allow changes to the message if it's deactivated or rate limited
        if (this.deactivated || this.rateLimited) {
            return;
        }

        // Assign the message's new embed
        this.content = new APIMessage(this.channel, { embed: newEmbed });

        // If this instance's message has been sent, edit it to reflect the changes
        this.sent && this.message.edit(this.content);
    }

    // Builds the message's embed again and sets it
    protected async refreshEmbed(): Promise<void> {
        let newEmbed: MessageEmbed;
        try {
            newEmbed = await this.buildEmbed();
        }
        catch (error) {
            throw new Error(`There was an error building an embed in an interactive message when refreshing it: ${error}`);
        }

        this.setEmbed(newEmbed);
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
            throw new Error("Attempted to add a button to an interactive message that already exists.");
        }

        // Add the button to the map
        this.buttons.set(button.emoji, button);
        this.buttonNames.set(button.name, button.emoji);

        // Only react to the message if it exists (otherwise the new button will be added upon the message being sent)
        this.sent && this.message.react(button.emoji);
    }

    // Adds an array of buttons instead of multiple explicit addButton calls
    protected addButtons(buttons: EmojiButton[]): void {
        buttons.forEach(button => {
            this.addButton(button);
        });
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
        let helpString = "";
        for (const button of this.buttons.values()) {
            // If the button is active, add the current button's help information if there is one
            helpString += (!button.disabled && button.helpMessage) ? `${button.emoji}: ${button.helpMessage} ` : "";
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
        this.emit("timeExpired");
        // Deactivate the message
        this.deactivate();
    }

    // Deactivates the interactive message, removing it from the handler's map and disabling this message's buttons
    protected deactivate(): void {
        // If the message is sent, has an embed, and needs deactivation text appended to it
        if (this.sent && this.message.embeds.length > 0 && this.deactivationText) {
            // Get the displayed embed of the message
            const embed = this.message.embeds[0];
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

        // Mark this message as being deactivated
        this.setDeactivated();

        // Indicate that this message has been deactivated
        this.emit("deactivate");

        // If the timer was running, cancel it for good (preventing this method from being called again accidentally)
        this.timer && clearTimeout(this.timer);

        // Remove the message from the handler's list
        interactiveMessageHandler.removeMessage(this);

        // Remove all listeners from this message
        this.removeAllListeners();
    }

    // Applies a rate limit to the message, preventing it from being edited until the limit expires
    public applyRateLimit(timeout: number): void {
        // Indicate that this message is rate limited
        this.setRateLimited(true);

        // Reverse the flag after the given timeout
        setTimeout(() => {
           this.setRateLimited(false); 
        }, timeout);
    }
}