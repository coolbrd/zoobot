import GameObject from "./GameObject";

export default class GameObjectListField<ElementType> {
    private gameObject: GameObject;
    private _list: ElementType[];

    constructor(gameObject: GameObject, list: ElementType[]) {
        this.gameObject = gameObject;
        this._list = list;
    }

    public get list(): ElementType[] {
        return this._list;
    }

    public push(...elements: ElementType[]): number {
        this.gameObject.modify();

        return this._list.push(...elements);
    }

    public insert(position: number, ...elements: ElementType[]): void {
        this.gameObject.modify();

        this._list.splice(position, 0, ...elements);
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

        this.gameObject.modify();

        this._list.splice(indexInBaseList, 1);
    }

    public removePositional(positions: number[]): ElementType[] {
        this.gameObject.modify();

        const elements: ElementType[] = [];
        positions.forEach(currentPosition => {
            elements.push(this._list[currentPosition]);
        });

        elements.forEach(element => {
            this.remove(element);
        });

        return elements;
    }

    public getAs<OutputType>(transform: (element: ElementType) => OutputType): OutputType[] {
        const transformedList: OutputType[] = [];

        this._list.forEach(element => {
            const transformedElement = transform(element);

            transformedList.push(transformedElement);
        });

        return transformedList;
    }
}