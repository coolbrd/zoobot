import { MessageEmbed } from "discord.js";
import PagedMessage from "./PagedMessage";

export default abstract class PagedListMessage<ElementType> extends PagedMessage {
    protected readonly abstract elementsPerField: number;
    protected readonly abstract fieldsPerPage: number;

    protected abstract formatElement(element: ElementType): string;

    protected elements: ElementType[] = [];

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
        const embed = await super.buildEmbed();

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

        return embed;
    }
}