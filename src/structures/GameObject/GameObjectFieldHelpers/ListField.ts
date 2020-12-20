import GameObject from "../GameObject";

export default class ListField<ElementType> {
    private gameObject: GameObject;
    private fieldName: string;
    private _list: ElementType[];

    constructor(gameObject: GameObject, fieldName: string, listField: ElementType[]) {
        this.gameObject = gameObject;
        this.fieldName = fieldName;
        this._list = listField;
    }

    public get list(): ElementType[] {
        return this._list;
    }

    public push(...elements: ElementType[]): number {
        const newLength = this._list.push(...elements);

        this.gameObject.modifyField(this.fieldName);

        return newLength;
    }

    public insert(position: number, ...elements: ElementType[]): void {
        this._list.splice(position, 0, ...elements);

        this.gameObject.modifyField(this.fieldName);
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

        this.gameObject.modifyField(this.fieldName);
    }

    public removePositional(positions: number[]): ElementType[] {
        const elements: ElementType[] = [];
        positions.forEach(currentPosition => {
            elements.push(this._list[currentPosition]);
        });

        elements.forEach(element => {
            this.remove(element);
        });

        this.gameObject.modifyField(this.fieldName);

        return elements;
    }
}