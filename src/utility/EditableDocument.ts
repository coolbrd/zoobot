import { PointedArray } from "./pointedArray";

// A set of informational fields pertaining to a field of a document
interface EditableDocumentFieldInfo {
    // The human-formatted name of the field
    alias: string,
    prompt?: string,
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