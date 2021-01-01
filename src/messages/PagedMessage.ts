import { stripIndent } from 'common-tags';
import { DMChannel, MessageEmbed, TextChannel, User } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";
import SmartEmbed from "../discordUtility/SmartEmbed";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import loopValue from "../utility/loopValue";

export default abstract class PagedMessage extends InteractiveMessage {
    private _page = 0;

    protected abstract get pageCount(): number;

    constructor(channel: TextChannel | DMChannel, beastiaryClient: BeastiaryClient) {
        super(channel, beastiaryClient);
    }

    public async build(): Promise<void> {
        if (this.pageCount > 1) {
            this.addButtons([
                {
                    name: "leftArrow",
                    emoji: "⬅️",
                    helpMessage: "Page left"
                },
                {
                    name: "rightArrow",
                    emoji: "➡️",
                    helpMessage: "Page right"
                }
            ]);
        }
    }

    protected get page(): number {
        return this._page;
    }

    protected set page(page: number) {
        this._page = loopValue(page, 0, this.pageCount - 1);
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        embed.setFooter(stripIndent`
            Page ${this.page + 1}/${this.pageCount}
            ${this.getButtonHelpString()}
        `);

        return embed;
    }

    protected async buttonPress(buttonName: string, user: User): Promise<void> {
        try {
            await super.buttonPress(buttonName, user);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error performing a paged message's inherited button press behavior.

                ${error}
            `);
        }

        switch (buttonName) {
            case "leftArrow": {
                this.page--;
                break;
            }
            case "rightArrow": {
                this.page++;
                break;
            }
        }

        try {
            await this.refreshEmbed();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error refreshing the embed of a paged message after a button press.

                Message: ${this.debugString}

                ${error}
            `);
        }
    }
}