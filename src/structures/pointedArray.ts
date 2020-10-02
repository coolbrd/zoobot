import loopValue from "../utility/loopValue";

// An array that has a movable pointer
export default class PointedArray<T> extends Array {
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
    public toString(options?: {
        delimiter?: string,
        numbered?: boolean,
        pointer?: string,
        filter?: (element: T) => string,
        numberFilter?: (element: string) => string
    }): string {
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
            // If the array is supposed to be numbered
            if (options && options.numbered) {
                // Create the number string for this element
                let numberString = `${arrayIndex + 1})`;

                // If a number filter was provided
                if (options && options.numberFilter) {
                    // Style the number according to the filter
                    numberString = options.numberFilter(numberString);
                }

                // Add the number to the string
                returnString += numberString;
            }
            
            // The string representation of the current value
            let currentValueString: string;
            // If a filter was provided in the options object
            if (options && options.filter) {
                // Get the value's string by running it through the filter
                currentValueString = options.filter(value);
            }
            // If no filter was provided
            else {
                // Get the value's string as according to String and toString
                currentValueString = String(value).toString();
            }

            // Append the current value 
            returnString += currentValueString;
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

    // Clears the array of all values
    public clear(): void {
        while (this.length > 0) {
            this.pop();
        }
    }
}