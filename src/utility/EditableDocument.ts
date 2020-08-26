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

// A set of informational fields pertaining to a field of a document
interface EditableDocumentFieldInfo {
    // The human-formatted name of the field
    alias: string,
    type: 'document' | 'array' | 'string' | 'boolean',
    documentType?: EditableDocumentSkeleton,
    arrayType?: EditableDocumentSkeleton | 'string'
}

export interface EditableDocumentSkeleton {
    [path: string]: EditableDocumentFieldInfo
}

export interface EditableDocumentField {
    fieldInfo: EditableDocumentFieldInfo,
    value: EditableDocument | PointedArray<EditableDocument | string> | string | boolean;
}

export default class EditableDocument {
    public readonly fields = new Map<string, EditableDocumentField>();
    public readonly fieldNames = new PointedArray<string>();

    constructor(skeleton: EditableDocumentSkeleton) {
        if (skeleton === {}) {
            throw new Error('Cannot form a new EditableDocument from an empty object');
        }

        for (const [key, fieldInfo] of Object.entries(skeleton)) {
            let value: EditableDocument | PointedArray<EditableDocument | string> | string | boolean;
            switch (fieldInfo.type) {
                case 'document': {
                    if (!fieldInfo.documentType) {
                        throw new Error('Must supply an EditableDocumentSkeleton in the documentType field if using Document type.');
                    }

                    value = new EditableDocument(fieldInfo.documentType);
                    break;
                }
                case 'array': {
                    if (!fieldInfo.arrayType) {
                        throw new Error('Must supply a type in the arrayType field if using Array type.');
                    }

                    if (fieldInfo.arrayType === 'string') {
                        value = new PointedArray<string>();
                    }
                    else {
                        value = new PointedArray<EditableDocument>();
                    }
                    break;
                }
                case 'string': {
                    value = '';
                    break;
                }
                case 'boolean': {
                    value = false;
                    break;
                }
            }

            this.fields.set(key, {
                fieldInfo: fieldInfo,
                value: value
            });
            this.fieldNames.push(key);
        }
    }

    public toString(): string {
        return 'Document';
    }

    public getSelection(): EditableDocumentField {
        const selected = this.fields.get(this.fieldNames.selection());
        if (!selected) {
            throw new Error('An editable document returned nothing when retrieving its selection.');
        }

        return selected;
    }
}