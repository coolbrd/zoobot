import { EventEmitter } from "events";
import { Message, User, TextChannel, DMChannel, MessageEmbed } from "discord.js";
import { betterSend, safeEdit, safeReact } from "../discordUtility/messageMan";
import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import { inspect } from "util";

interface EmojiButton {
    emoji: string,
    name: string,
    disabled?: boolean,
    helpMessage?: string
}

// A message with pressable reaction buttons
export default abstract class InteractiveMessage extends EventEmitter {
    protected readonly beastiaryClient: BeastiaryClient;

    // The number of milliseconds that this message will be active for
    // This number is used as an inactivity cooldown that gets reset on each button press by default
    protected readonly abstract lifetime: number;

    // The method that uses this message's information in order to build its embed
    protected abstract buildEmbed(): Promise<MessageEmbed>;

    protected readonly resetTimerOnButtonPress: boolean = true;
    protected deactivationText = "(message deactivated)";

    public readonly channel: TextChannel | DMChannel;

    private readonly buttons: Map<string, EmojiButton> = new Map();
    private readonly buttonNames: Map<string, string> = new Map();

    private _message: Message | undefined;
    private _content: MessageEmbed | undefined;
    private _rateLimited = false;
    private pendingContent: MessageEmbed | undefined;

    private _timer: NodeJS.Timeout | undefined;

    private _deactivated = false;

    private reactionFailWarned = false;

    constructor(channel: TextChannel | DMChannel, beastiaryClient: BeastiaryClient) {
        super();

        this.beastiaryClient = beastiaryClient;

        this.channel = channel;
    }

    private get content(): MessageEmbed | undefined {
        return this._content;
    }

    private set content(content: MessageEmbed | undefined) {
        if (this.sent && !content) {
            throw new Error(stripIndent`
                Attempted to set the content of a sent interactive message to nothing.

                Interactive message: ${this.debugString}
            `);
        }

        this._content = content;
    }

    public get message(): Message {
        if (!this._message) {
            throw new Error(stripIndent`
                Attempted to get the message of an interactive message that hasn't been sent yet.

                Interactive message: ${this.debugString}
            `);
        }

        return this._message;
    }

    private setMessage(message: Message): void {
        if (this._message) {
            throw new Error(stripIndent`
                Tried to set an interactive message to a message after it had already been sent.

                Interactive message: ${this.debugString}
                Message: ${inspect(message)}
            `);
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
        this._timer = timer;
    }

    public get deactivated(): boolean {
        return this._deactivated;
    }

    private setDeactivated(): void {
        this._deactivated = true;
    }

    protected getEmojiByName(buttonName: string): string {
        const targetEmoji = this.buttonNames.get(buttonName);

        if (!targetEmoji) {
            throw new Error(stripIndent`
                Couldn't find an emoji in a map of button names by a given name.

                Button name: ${buttonName}
                Interactive message: ${this.debugString}
            `);
        }

        return targetEmoji;
    }

    protected getButtonByEmoji(emoji: string): EmojiButton {
        const targetButton = this.buttons.get(emoji);

        if (!targetButton) {
            throw new Error(stripIndent`
                Couldn't find a button in a map of buttons by a given emoji.

                Emoji: ${emoji}
                Interactive message: ${this.debugString}
            `);
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
            throw new Error(stripIndent`
                Tried to send an interactive message with no content.

                Interactive message: ${this.debugString}
            `);
        }

        const message = await betterSend(this.channel, this.content);

        if (!message) {
            return;
        }

        this.setMessage(message);

        this.beastiaryClient.interactiveMessageHandler.addMessage(this);

        for (const button of this.buttons.values()) {
            safeReact(this.message, button.emoji).catch(() => {
                if (!this.reactionFailWarned) {
                    betterSend(this.channel, "Hmm, I couldn't add reactions to a message. Do I have the proper permission to do that in this channel?");
                    this.reactionFailWarned = true;
                }
            });
        }

        this.timer = this.setTimer();
    }

    // Where any pre-send asynchonous building funcionality should go in subclasses
    public async build(): Promise<void> {
        return;
    }

    public async send(): Promise<void> {
        if (!this.built) {
            try {
                await this.build();
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error initially building an interactive message before sending it.

                    Message: ${this.debugString}

                    ${error}
                `);
            }
        }

        try {
            await this.refreshEmbed();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error initially building an interactive message's embed.

                Interactive message: ${this.debugString}
                
                ${error}
            `);
        }

        try {
            await this.sendAndAddButtons();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending and adding buttons to an interactive message.

                Interactive message: ${this.debugString}
                
                ${error}
            `);
        }
    }

    private setEmbed(newEmbed: MessageEmbed): void {
        if (this.deactivated) {
            return;
        }

        if (this.rateLimited) {
            this.pendingContent = newEmbed;
            return;
        }

        this.content = newEmbed;

        if (this.sent) {
            safeEdit(this.message, this.content);
        }
    }

    private applyPendingContent(): void {
        if (this.pendingContent) {
            safeEdit(this.message, this.pendingContent);
            this.pendingContent = undefined;
        }
    }

    protected async refreshEmbed(): Promise<void> {
        let newEmbed: MessageEmbed;
        try {
            newEmbed = await this.buildEmbed();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error building an embed in an interactive message when refreshing it.

                Interactive message: ${this.debugString}
                
                ${error}
            `);
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
            throw new Error(stripIndent`
                Attempted to add a button to an interactive message that already exists.

                Button: ${inspect(button)}
                Interactive message: ${this.debugString}
            `);
        }

        this.buttons.set(button.emoji, button);
        this.buttonNames.set(button.name, button.emoji);

        if (this.sent) {
            safeReact(this.message, button.emoji);
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
        if (this.deactivated) {
            throw new Error(stripIndent`
                Tried to set an interactive message's timer after it was deactivated.

                Interactive message: ${this.debugString}
            `);
        }

        return setTimeout(() => {
            this.timeExpired();
        }, this.lifetime);
    }

    public async pressButtonByEmojiAndRefresh(emoji: string, user: User): Promise<void> {
        try {
            await this.pressButtonByEmoji(emoji, user);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error pressing an interactive message's emoji button.

                Emoji: ${emoji}
                User: ${inspect(user)}
                Interactive message: ${this.debugString}
                
                ${error}
            `);
        }

        try {
            await this.refreshEmbed();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error refreshing an interactive message's embed after its button was pressed.

                Interactive message: ${this.debugString}
                
                ${error}
            `);
        }
    }

    protected async pressButtonByEmoji(emoji: string, user: User): Promise<void> {
        try {
            await this.buttonPress(this.getButtonByEmoji(emoji).name, user);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error pressing an interactive message's button.

                Emoji: ${emoji}
                User: ${inspect(user)}
                Interactive message: ${this.debugString}
                
                ${error}
            `);
        }
    }

    protected async buttonPress(_button: string, _user: User): Promise<void> {
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
        const hasButtons = this.buttons.size > 0;
        const hasEmbed = this.message.embeds.length > 0;

        if (hasButtons && this.deactivationText && this.sent && hasEmbed) {
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

        this.beastiaryClient.interactiveMessageHandler.removeMessage(this);

        this.removeAllListeners();
    }

    private beginRateLimit(): void {
        this.setRateLimited(true);
    }

    private endRateLimit(): void {
        this.setRateLimited(false);
        this.applyPendingContent();
    }

    public applyRateLimit(timeout: number): void {
        this.beginRateLimit();

        setTimeout(() => {
           this.endRateLimit();
        }, timeout);
    }

    public get debugString(): string {
        return stripIndent`
            Message: ${inspect(this._message)}
            Deactivated: ${this.deactivated}
        `;
    }
}