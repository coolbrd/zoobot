import { DMChannel, TextChannel } from "discord.js";
import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import PointedArray from "../structures/PointedArray";
import loopValue from "../utility/loopValue";

// A message that's meant to be extended, keeps track of a paged set of elements and provides utility methods for doing so
export default class PagedMessage<ElementType> extends InteractiveMessage {
    // The array of elements to show in this message
    private elements = new PointedArray<ElementType>();

    // The current page to display
    private page = 0;
    // The number of elements displayed on one page
    private elementsPerPage = 10;

    constructor(channel: TextChannel | DMChannel, elementsPerPage?: number) {
        super(channel, { buttons: [
            {
                name: 'leftArrow',
                emoji: '⬅️',
                helpMessage: 'Page left'
            },
            {
                name: 'rightArrow',
                emoji: '➡️',
                helpMessage: 'Page right'
            }
        ]});

        if (elementsPerPage) {
            this.elementsPerPage = elementsPerPage;
        }
    }

    protected getElements(): PointedArray<ElementType> {
        return this.elements;
    }

    protected getPage(): number {
        return this.page;
    }

    protected getElementsPerPage(): number {
        return this.elementsPerPage;
    }

    // Gets the current slice of this message's elements represented by the current page
    protected getVisibleElements(): ElementType[] {
        const elementsPerPage = this.getElementsPerPage();
        const startIndex = this.getPage() * elementsPerPage;
        return this.getElements().slice(startIndex, startIndex + elementsPerPage);
    }

    // Gets the number of pages currently in this message
    protected getPageCount(): number {
        return Math.ceil(this.elements.length / this.elementsPerPage);
    }

    // Gets the index of the first element on the current page
    protected getFirstVisibleIndex(): number {
        return this.getPage() * this.getElementsPerPage();
    }

    // Gets the page that the pointer is currently on
    protected getPointerPage(): number {
        return Math.floor(this.elements.getPointerPosition() / this.elementsPerPage);
    }

    protected setElements(newElements: ElementType[]): void {
        this.elements = new PointedArray<ElementType>(newElements);
    }

    // Move a number of pages
    protected movePages(count: number): void {
        // Moves the desired number of pages, looping if necessary
        this.page = loopValue(this.page + count, 0, this.getPageCount() - 1);
        // If the page move caused the pointer to be off the page
        if (!this.pointerIsOnPage()) {
            // Move the pointer to the first entry on the page
            this.elements.setPointerPosition(this.page * this.elementsPerPage);
        }
    }

    // Checks if the pointer is on the message's currently displayed page
    protected pointerIsOnPage(): boolean {
        return this.page === this.getPointerPage();
    }

    // Moves to the page that the pointer is on
    protected goToPointerPage(): void {
        this.page = this.getPointerPage();
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