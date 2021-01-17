import GameObject from "../GameObject";

export default class ListField<ElementType> {
    private readonly gameObject: GameObject;
    private readonly fieldName: string;
    private readonly _list: ElementType[];

    constructor(gameObject: GameObject, fieldName: string, listField: ElementType[]) {
        this.gameObject = gameObject;
        this.fieldName = fieldName;
        this._list = listField;
    }

    public get list(): ElementType[] {
        this.modify();

        return this._list;
    }

    public push(...elements: ElementType[]): number {
        const newLength = this._list.push(...elements);

        this.modify();

        return newLength;
    }

    public insert(position: number, ...elements: ElementType[]): void {
        this._list.splice(position, 0, ...elements);

        this.modify();
    }

    public splice(startIndex: number, deleteCount?: number): void {
        this._list.splice(startIndex, deleteCount);

        this.modify();
    }

    public getPosition(position: number): ElementType | undefined {
        if (position < 0 || position >= this._list.length) {
            return undefined;
        }
        else {
            return this._list[position];
        }
    }

    public remove(element: ElementType): void {
        const indexInBaseList = this._list.indexOf(element);

        if (indexInBaseList == -1) {
            return;
        }

        this._list.splice(indexInBaseList, 1);

        this.modify();
    }

    public removeWhere(predicate: (element: ElementType) => boolean): void {
        const elementToRemove = this._list.find(predicate);

        if (elementToRemove) {
            this.remove(elementToRemove);
        }
    }

    public clear(): void {
        while (this._list.length) {
            this._list.pop();
        }

        this.modify();
    }

    public removePositional(positions: number[]): ElementType[] {
        const elements: ElementType[] = [];
        positions.forEach(currentPosition => {
            elements.push(this._list[currentPosition]);
        });

        elements.forEach(element => {
            this.remove(element);
        });

        this.modify();

        return elements;
    }

    public modify(): void {
        this.gameObject.modifyField(this.fieldName);
    }
}