import { DMChannel, TextChannel } from "discord.js";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import PointedArray from "../structures/PointedArray";
import loopValue from "../utility/loopValue";

// A message that's meant to be extended, keeps track of a paged set of elements and provides utility methods for doing so
export default abstract class PagedMessage<ElementType> extends InteractiveMessage {
    protected readonly abstract elementsPerPage: number;

    // The array of elements to show in this message
    private _elements = new PointedArray<ElementType>();

    // The current page to display
    private _page = 0;

    constructor(channel: TextChannel | DMChannel, singlePage?: boolean) {
        super(channel);

        // Add page control buttons if this paged message isn't marked as being a single page
        if (!singlePage) {
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

    protected get elements(): PointedArray<ElementType> {
        return this._elements;
    }

    protected setElements(elements: ElementType[]): void {
        this._elements = new PointedArray<ElementType>(elements);
    }

    protected get page(): number {
        return this._page;
    }

    protected set page(page: number) {
        if (page < 0 || page > this.pageCount) {
            throw new Error("A paged message attempted to go out of its page boundaries.");
        }

        this._page = page;
    }

    protected get pageCount(): number {
        return Math.ceil(this.elements.length / this.elementsPerPage);
    }

    // Gets the current slice of this message's elements represented by the current page
    protected get visibleElements(): ElementType[] {
        const elementsPerPage = this.elementsPerPage;
        const startIndex = this.page * elementsPerPage;
        return this.elements.slice(startIndex, startIndex + elementsPerPage);
    }

    // Gets the index of the first element on the current page
    protected get firstVisibleIndex(): number {
        return this.page * this.elementsPerPage;
    }

    // Gets the page that the pointer is currently on
    protected get pointerPage(): number {
        return Math.floor(this.elements.pointerPosition / this.elementsPerPage);
    }

    // Move a number of pages
    protected movePages(count: number): void {
        // Moves the desired number of pages, looping if necessary
        this.page = loopValue(this.page + count, 0, this.pageCount - 1);
        // If the page move caused the pointer to be off the page
        if (!this.pointerIsOnPage()) {
            // Move the pointer to the first entry on the page
            this.elements.pointerPosition = this.page * this.elementsPerPage;
        }
    }

    // Checks if the pointer is on the message's currently displayed page
    protected pointerIsOnPage(): boolean {
        return this.page === this.pointerPage;
    }

    // Moves to the page that the pointer is on
    protected goToPointerPage(): void {
        this.page = this.pointerPage;
    }

    // Moves the pointer a number of positions
    protected movePointer(count: number): void {
        // Move the pointer to the new position
        this.elements.movePointer(count);
        // If moving the pointer made it leave the page
        if (!this.pointerIsOnPage()) {
            // Change the page to the one that the pointer's on
            this.goToPointerPage();
        }
    }
}