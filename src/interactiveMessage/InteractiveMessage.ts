import { EventEmitter } from "events";
import { Message, User, TextChannel, APIMessage, DMChannel, MessageEmbed } from "discord.js";
import { betterSend } from "../discordUtility/messageMan";
import { interactiveMessageHandler } from "./InteractiveMessageHandler";

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

    protected readonly resetTimerOnButtonPress = true;
    protected readonly defaultDeactivationText = "(message deactivated)";

    public readonly channel: TextChannel | DMChannel;

    private readonly buttons: Map<string, EmojiButton> = new Map();
    private readonly buttonNames: Map<string, string> = new Map();

    private _message: Message | undefined;
    private _content: APIMessage | undefined;
    private _rateLimited = false;

    private _timer: NodeJS.Timeout | undefined;

    private _deactivated = false;
    private _deactivationText = this.defaultDeactivationText;

    constructor(channel: TextChannel | DMChannel) {
        super();

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

    protected getEmojiByName(buttonName: string): string {
        const targetEmoji = this.buttonNames.get(buttonName);

        if (!targetEmoji) {
            throw new Error("Couldn't find an emoji in a map of button names by a given name.");
        }

        return targetEmoji;
    }

    protected getButtonByEmoji(emoji: string): EmojiButton {
        const targetButton = this.buttons.get(emoji);

        if (!targetButton) {
            throw new Error("Couldn't find a button in a map of buttons by a given emoji.");
        }

        return targetButton;
    }

    protected getButtonByName(buttonName: string): EmojiButton {
        const targetEmoji = this.getEmojiByName(buttonName);

        return this.getButtonByEmoji(targetEmoji);
    }

    protected setDeactivationText(newText: string): void {
        this.deactivationText = newText;
    }

    private async sendAndAddButtons(): Promise<void> {
        if (!this.content) {
            throw new Error("Tried to send an interactive message with no content");
        }

        const message = await betterSend(this.channel, this.content);

        if (!message) {
            throw new Error("An interactive message's message was unable to be sent.");
        }

        this.setMessage(message);

        interactiveMessageHandler.addMessage(this);

        for (const button of this.buttons.values()) {
            try {
                await this.message.react(button.emoji);
            }
            catch (error) {
                throw new Error(`Error trying to add reactions to an interactive message: ${error}`);
            }
        }

        this.timer = this.setTimer();
    }

    // Where any pre-send asynchonous building funcionality should go in subclasses
    public async build(): Promise<void> {
        return;
    }

    public async send(): Promise<void> {
        if (!this.built) {
            await this.build();
        }

        try {
            await this.refreshEmbed();
        }
        catch (error) {
            throw new Error(`There was an error initially building an interactive message's embed: ${error}`);
        }

        try {
            await this.sendAndAddButtons();
        }
        catch (error) {
            throw new Error(`There was an error sending and adding buttons to an interactive message: ${error}`);
        }
    }

    private setEmbed(newEmbed: MessageEmbed): void {
        if (this.deactivated || this.rateLimited) {
            return;
        }

        this.content = new APIMessage(this.channel, { embed: newEmbed });

        if (this.sent) {
            this.message.edit(this.content);
        }
    }

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

    public getActiveButtonEmojis(): string[] {
        const activeButtons = [];
        for (const button of this.buttons.values()) {
            if (!button.disabled) {
                activeButtons.push(button.emoji);
            }
        }
        return activeButtons;
    }

    protected addButton(button: EmojiButton): void {
        if (this.hasSimilarButton(button)) {
            throw new Error("Attempted to add a button to an interactive message that already exists.");
        }

        this.buttons.set(button.emoji, button);
        this.buttonNames.set(button.name, button.emoji);

        if (this.sent) {
            this.message.react(button.emoji);
        }
    }

    protected addButtons(buttons: EmojiButton[]): void {
        buttons.forEach(button => {
            this.addButton(button);
        });
    }

    protected removeButton(buttonName: string): void {
        this.buttons.delete(this.getEmojiByName(buttonName));
        this.buttonNames.delete(buttonName);
    }

    protected enableButton(buttonName: string): void {
        this.getButtonByName(buttonName).disabled = false;
    }

    protected disableButton(buttonName: string): void {
        this.getButtonByName(buttonName).disabled = true;
    }

    protected setButtonHelpMessage(buttonName: string, newMessage: string): void {
        this.getButtonByName(buttonName).helpMessage = newMessage;
    }

    protected getButtonHelpString(): string {
        let helpString = "";
        for (const button of this.buttons.values()) {
            helpString += (!button.disabled && button.helpMessage) ? `${button.emoji}: ${button.helpMessage} ` : "";
        }
        return helpString;
    }

    private setTimer(): NodeJS.Timer {
        return setTimeout(() => {
            this.timeExpired();
        }, this.lifetime);
    }

    public async pressButtonByEmojiAndRefresh(emoji: string, user: User): Promise<void> {
        this.pressButtonByEmoji(emoji, user);

        try {
            await this.refreshEmbed();
        }
        catch (error) {
            throw new Error(`There was an error refreshing an interactive message's embed after its button was pressed: ${error}`);
        }
    }

    protected pressButtonByEmoji(emoji: string, user: User): void {
        this.buttonPress(this.getButtonByEmoji(emoji).name, user);
    }

    protected buttonPress(_button: string, _user: User): void {
        if (this.resetTimerOnButtonPress && this.timer) {
            clearTimeout(this.timer);
            this.timer = this.setTimer();
        }
    }

    private timeExpired(): void {
        this.emit("timeExpired");
        this.deactivate();
    }

    protected deactivate(): void {
        if (this.sent && this.message.embeds.length > 0 && this.deactivationText) {
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

        this.setDeactivated();
        this.emit("deactivate");

        if (this.timer) {
            clearTimeout(this.timer);
        }

        interactiveMessageHandler.removeMessage(this);

        this.removeAllListeners();
    }

    public applyRateLimit(timeout: number): void {
        this.setRateLimited(true);

        setTimeout(() => {
           this.setRateLimited(false); 
        }, timeout);
    }
}