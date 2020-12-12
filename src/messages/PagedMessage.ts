import { stripIndent } from 'common-tags';
import { DMChannel, MessageEmbed, TextChannel, User } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";
import SmartEmbed from "../discordUtility/SmartEmbed";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import loopValue from "../utility/loopValue";

export default abstract class PagedMessage<ElementType> extends InteractiveMessage {
    protected readonly abstract elementsPerField: number;
    protected readonly abstract fieldsPerPage: number;

    protected abstract formatElement(element: ElementType): string;

    protected elements: ElementType[] = [];
    private _page = 0;

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

    protected get elementsPerPage(): number {
        return this.fieldsPerPage * this.elementsPerField;
    }

    protected get pageCount(): number {
        return Math.ceil(this.elements.length / this.elementsPerPage);
    }

    protected get firstVisibleIndex(): number {
        return this.page * this.elementsPerPage;
    }

    protected get visibleElements(): ElementType[] {
        const lastVisibleIndex = this.firstVisibleIndex + this.elementsPerPage;

        return this.elements.slice(this.firstVisibleIndex, lastVisibleIndex);
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();

        let currentFieldElementCount = 0;
        let currentFieldString = "";

        const addFieldAndReset = () => {
            embed.addField("----", currentFieldString, true);
            currentFieldElementCount = 0;
            currentFieldString = "";
        }

        this.visibleElements.forEach(element => {
            if (currentFieldElementCount === this.elementsPerField) {
                addFieldAndReset();
            }

            currentFieldString += `${this.formatElement(element)}\n`;

            currentFieldElementCount++;
        });

        if (currentFieldElementCount) {
            addFieldAndReset();
        }

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