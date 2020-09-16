import { loopValue } from "./toolbox";

// An array that has a movable pointer
export class PointedArray<T> extends Array {
    // The position of the underlying pointer
    private pointerPosition = 0;

    // The position of the array's viewport (for printing the array as a string with a persistent and manipulable viewport)
    private viewPosition = 0;
    // The lenght, in elements, of the viewport
    // If its left at 0, its default, the viewport will extend to the end of the array
    private viewSize = 0;

    private readonly defaultDelimiter = ', ';

    constructor(array?: T[], options?: { viewSize?: number }) {
        super();
        // Initialize the array if one is provided
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
    public toString(options?: { delimiter?: string, numbered?: boolean, pointer?: string }): string {
        // Get the visible array of elements from this array (all elements within the viewport)
        const returnArray = this.getViewableSlice();

        let returnString = '';
        // Start tracking the index at the first displayed element
        let arrayIndex = this.viewPosition;

        // If the first element displayed isn't the first element in the array
        if (arrayIndex > 0) {
            // Indicate that this isn't the true beginning of the array
            returnString += `...${options && options.delimiter ? options.delimiter : this.defaultDelimiter}`
        }

        // Iterate over every value to display
        for (const value of returnArray) {
            // Append the index of the element, if indicated to do so
            returnString += `${options && options.numbered ? `${arrayIndex + 1}) ` : ''}`
            // Append the current value 
            returnString += String(value).toString();
            // Append the pointer if one was provided and the current element is the selection
            returnString += options && options.pointer ? (arrayIndex === this.getPointerPosition() ? ` ${options.pointer}` : '') : '';
            // Append a delimiter
            returnString += options && options.delimiter ? options.delimiter : this.defaultDelimiter;

            arrayIndex++;
        }

        // If there are elements beyond the viewport (afterwards)
        if (this.viewSize > 0 && this.viewPosition + this.viewSize < this.length) {
            // Indicate that such elements exist below what's currently seen
            returnString += '...'
        }

        return returnString;
    }

    // Gets an array of the elements that can currently be viewed, according to the viewport options
    public getViewableSlice(): T[] {
        return this.slice(this.viewPosition, this.viewSize === 0 ? undefined : this.viewPosition + this.viewSize);
    }

    public getPointerPosition(): number {
        return this.pointerPosition;
    }

    // Gets the element that the pointer is currently selecting
    public selection(): T {
        return this[this.pointerPosition];
    }

    // Sets the pointers position within the bounds of the array
    public setPointerPosition(newPosition: number): number {
        this.clampPointer(newPosition);
        this.clampViewPort();
        return this.pointerPosition;
    }

    // Returns the pointer to within the bounds of the array
    private clampPointer(newPosition?: number): number {
        return this.pointerPosition = Math.max(0, Math.min(this.length - 1, newPosition === undefined ? this.pointerPosition : newPosition));
    }

    // Keeps the viewport tied to the pointer's position
    private clampViewPort(): void {
        // If the pointer is before the beginning of the viewport
        if (this.pointerPosition < this.viewPosition) {
            // Set the viewport to the pointer's position
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

    // Moves the pointer up one position, loops
    public incrementPointer(): number {
        return this.movePointer(1);
    }

    // Moves the pointer down one position, loops
    public decrementPointer(): number {
        return this.movePointer(-1);
    }

    // Deletes the element currently under the pointer
    public deleteAtPointer(): void {
        this.splice(this.pointerPosition, 1);
        this.clampPointer();
    }

    // Adds an element to the position under the pointer
    public addAtPointer(element: T): void {
        this.splice(this.pointerPosition, 0, element);
    }
}