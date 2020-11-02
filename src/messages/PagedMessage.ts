import { DMChannel, TextChannel, User } from "discord.js";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import loopValue from "../utility/loopValue";

export default abstract class PagedMessage<ElementType> extends InteractiveMessage {
    protected readonly abstract elementsPerPage: number;

    protected elements: ElementType[] = [];
    private _page = 0;

    constructor(channel: TextChannel | DMChannel) {
        super(channel);
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

    protected setPage(page: number): void {
        this._page = loopValue(page, 0, this.pageCount - 1);
    }

    protected get pageCount(): number {
        return Math.ceil(this.elements.length / this.elementsPerPage);
    }

    protected get visibleElements(): ElementType[] {
        const lastVisibleIndex = this.firstVisibleIndex + this.elementsPerPage;
        return this.elements.slice(this.firstVisibleIndex, lastVisibleIndex);
    }

    protected get firstVisibleIndex(): number {
        return this.page * this.elementsPerPage;
    }

    protected buttonPress(buttonName: string, _user: User): void {
        switch (buttonName) {
            case "leftArrow": {
                this.setPage(this.page + 1);
                break;
            }
            case "rightArrow": {
                this.setPage(this.page - 1)
                break;
            }
        }
    }
}