import { stripIndent } from "common-tags";
import { User } from 'discord.js';
import PointedArray from '../structures/PointedArray';
import loopValue from '../utility/loopValue';
import PagedMessage from './PagedMessage';

export default abstract class PointedMessage<ElementType> extends PagedMessage<ElementType> {
    protected elements: PointedArray<ElementType> = new PointedArray<ElementType>();

    public async build(): Promise<void> {
        try {
            await super.build();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error building a pointed message's inherited structure.
                
                ${error}
            `);
        }

        if (this.elements.length > 1) {
            this.addButtons([
                {
                    name: "upArrow",
                    emoji: "⬆️",
                    helpMessage: "Pointer up"
                },
                {
                    name: "downArrow",
                    emoji: "⬇️",
                    helpMessage: "Pointer down"
                }
            ]);
        }
    }

    protected get page(): number {
        return super.page;
    }

    protected set page(page: number) {
        super.page = page;

        this.updatePointerPage();
    }

    private updatePointerPage(): void {
        if (!this.pointerIsOnPage) {
            this.pointerPage = this.page;
        }
    }

    public get selection(): ElementType {
        return this.elements.selection;
    }

    public get pointerPosition(): number {
        return this.elements.pointerPosition;
    }

    public set pointerPosition(pointerPosition: number) {
        this.elements.pointerPosition = loopValue(pointerPosition, 0, this.elements.length - 1);

        this.updatePointerPage();
    }

    public get pointerPage(): number {
        return Math.floor(this.elements.pointerPosition / this.elementsPerPage);
    }

    public set pointerPage(pointerPage: number) {
        this.elements.pointerPosition = pointerPage * this.elementsPerPage;
    }

    public get pointerIsOnPage(): boolean {
        return this.page === this.pointerPage;
    }

    protected async buttonPress(buttonName: string, user: User): Promise<void> {
        switch (buttonName) {
            case "upArrow": {
                this.pointerPosition -= 1;
                break;
            }
            case "downArrow": {
                this.pointerPosition += 1;
                break;
            }
        }
        
        try {
            await super.buttonPress(buttonName, user);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error performing inherited button press behavior in a pointed message.
                
                ${error}
            `);
        }
    }
}