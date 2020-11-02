import loopValue from "../utility/loopValue";

// An array that has a movable pointer
export default class PointedArray<T> extends Array {
    private _pointerPosition = 0;

    private viewPosition = 0;
    // If its left at 0, its default, the viewport will extend to the end of the array
    private viewSize = 0;

    private readonly defaultDelimiter = ", ";

    constructor(array?: T[], options?: { viewSize?: number }) {
        super();

        if (Array.isArray(array)) {
            for (const element of array) {
                this.push(element);
            }
        }

        if (options) {
            if (options.viewSize) {
                this.viewSize = options.viewSize;
            }
        }
    }

    // Converts the array to a string, with a number of optional formatting fields
    public toString(options?: {
        delimiter?: string,
        numbered?: boolean,
        pointer?: string,
        filter?: (element: T) => string,
        numberFilter?: (element: string) => string
    }): string {
        const returnArray = this.viewableSlice;

        let returnString = "";
        let arrayIndex = this.viewPosition;

        if (arrayIndex > 0) {
            returnString += `...${options && options.delimiter ? options.delimiter : this.defaultDelimiter}`
        }

        for (const value of returnArray) {
            if (options && options.numbered) {
                let numberString = `${arrayIndex + 1})`;

                if (options && options.numberFilter) {
                    numberString = options.numberFilter(numberString);
                }

                returnString += numberString;
            }
            
            let currentValueString: string;
            if (options && options.filter) {
                currentValueString = options.filter(value);
            }
            // If no filter was provided
            else {
                currentValueString = String(value).toString();
            }

            returnString += currentValueString;
            returnString += options && options.pointer ? (arrayIndex === this.pointerPosition ? ` ${options.pointer}` : "") : "";
            returnString += options && options.delimiter ? options.delimiter : this.defaultDelimiter;

            arrayIndex++;
        }

        if (this.viewSize > 0 && this.viewPosition + this.viewSize < this.length) {
            returnString += "..."
        }

        return returnString;
    }

    // Gets an array of the elements that can currently be viewed, according to the viewport options
    public get viewableSlice(): T[] {
        return this.slice(this.viewPosition, this.viewSize === 0 ? undefined : this.viewPosition + this.viewSize);
    }

    public get pointerPosition(): number {
        return this._pointerPosition;
    }

    public set pointerPosition(newPosition: number) {
        this.clampPointer(newPosition);
        this.clampViewPort();
    }

    public get selection(): T {
        return this[this.pointerPosition];
    }

    // Returns the pointer to within the bounds of the array
    private clampPointer(newPosition?: number): number {
        return this._pointerPosition = Math.max(0, Math.min(this.length - 1, newPosition === undefined ? this.pointerPosition : newPosition));
    }

    private clampViewPort(): void {
        if (this.pointerPosition < this.viewPosition) {
            this.viewPosition = this.pointerPosition;
        }
        // If the viewport has been given a size, and the pointer is beyond the extent of the viewport
        else if (this.viewSize > 0 && this.pointerPosition > this.viewPosition + this.viewSize - 1) {
            this.viewPosition = this.pointerPosition - this.viewSize + 1;
        }
    }

    public movePointer(amount: number): number {
        this.pointerPosition = loopValue(this.pointerPosition + amount, 0, this.length - 1);

        this.clampViewPort();

        return this.pointerPosition;
    }

    public incrementPointer(): number {
        return this.movePointer(1);
    }

    public decrementPointer(): number {
        return this.movePointer(-1);
    }

    public deleteAtPointer(): void {
        this.splice(this.pointerPosition, 1);
        this.clampPointer();
    }

    public addAtPointer(element: T): void {
        this.splice(this.pointerPosition, 0, element);
    }

    public clear(): void {
        while (this.length > 0) {
            this.pop();
        }
    }
}