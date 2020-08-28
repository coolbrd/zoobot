// An array that has a movable pointer
export class PointedArray<T> extends Array {
    // The position of the underlying pointer
    private pointerPosition = 0;

    public toString(delimiter?: string): string {
        return this.join(delimiter);
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
        return this.clampPointer(newPosition);
    }

    // Returns the pointer to within the bounds of the array
    private clampPointer(newPosition?: number) {
        return this.pointerPosition = Math.max(0, Math.min(this.length - 1, newPosition || this.pointerPosition));
    }

    // Moves the pointer up one position, loops
    public incrementPointer(): number {
        return this.pointerPosition = this.pointerPosition + 1 > this.length - 1 ? 0 : this.pointerPosition + 1;
    }

    // Moves the pointer down one position, loops
    public decrementPointer(): number {
        return this.pointerPosition = this.pointerPosition - 1 < 0 ? this.length - 1 : this.pointerPosition - 1;
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