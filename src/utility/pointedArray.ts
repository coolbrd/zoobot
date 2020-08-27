export class PointedArray<T> {
    private readonly array: T[];
    private position = 0;

    constructor(array?: T[]) {
        if (array) {
            this.array = array;
        }
        else {
            this.array = [];
        }
    }

    public toString(): string {
        return this.array.join('\n');
    }

    public getArray(): T[] {
        return this.array;
    }

    public push(element: T): void {
        this.array.push(element);
    }

    public getPointerPosition(): number {
        return this.position;
    }

    public selection(): T {
        return this.array[this.position];
    }

    public setPointerPosition(newPosition: number): number {
        return this.clampPointer(newPosition);
    }

    private clampPointer(newPosition?: number) {
        return this.position = Math.max(0, Math.min(this.array.length - 1, newPosition || this.position));
    }

    public incrementPointer(): number {
        return this.position = this.position + 1 > this.array.length - 1 ? 0 : this.position + 1;
    }

    public decrementPointer(): number {
        return this.position = this.position - 1 < 0 ? this.array.length - 1 : this.position - 1;
    }

    public deleteAtPointer(): void {
        this.array.splice(this.position, 1);
        this.clampPointer();
    }

    public addAtPointer(element: T): void {
        this.array.splice(this.position, 0, element);
    }
}