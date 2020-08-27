import { PointedArray } from "./pointedArray";

// A set of informational fields pertaining to a field of a document
interface EditableDocumentFieldInfo {
    // The human-formatted name of the field
    alias: string,
    // The optional prompt for informing the user about input guidelines
    prompt?: string,
    type: 'document' | 'array' | 'string' | 'boolean',
    // The type of document, used if the type is 'document'
    documentType?: EditableDocumentSkeleton,
    // The type stored within the array, used if the type is 'array'
    arrayType?: EditableDocumentSkeleton | 'string'
}

// A blueprint used to construct a new empty editable document
export interface EditableDocumentSkeleton {
    [path: string]: EditableDocumentFieldInfo
}

// A single field within a document. Contains both the given field info and the value to eventually be set.
export interface EditableDocumentField {
    fieldInfo: EditableDocumentFieldInfo,
    value: EditableDocument | PointedArray<EditableDocument | string> | string | boolean;
}

// A document containing a set of fields that can be edited through some given user interface
export default class EditableDocument {
    // The document's fields
    public readonly fields = new Map<string, EditableDocumentField>();
    // The names of the document's fields, in a pointed array so the fields can be loosely indexed for user pointer selection
    public readonly fieldNames = new PointedArray<string>();

    // Create a new document from a given skeleton
    constructor(skeleton: EditableDocumentSkeleton) {
        // Don't accept empty skeletons
        if (skeleton === {}) {
            throw new Error('Cannot form a new EditableDocument from an empty object');
        }

        // Iterate over every field in the skeleton
        for (const [key, fieldInfo] of Object.entries(skeleton)) {
            // The default value that will be assigned to this field
            let value: EditableDocument | PointedArray<EditableDocument | string> | string | boolean;

            // Field type behavior
            switch (fieldInfo.type) {
                // If the field is a document
                case 'document': {
                    // Make sure the document's type (skeleton) is provided
                    if (!fieldInfo.documentType) {
                        throw new Error('Must supply an EditableDocumentSkeleton in the documentType field if using Document type.');
                    }

                    // Initialize an empty document of the given type as the default value
                    value = new EditableDocument(fieldInfo.documentType);
                    break;
                }
                // If the field is an array
                case 'array': {
                    // Make sure the array's type (skeleton) is provided
                    if (!fieldInfo.arrayType) {
                        throw new Error('Must supply a type in the arrayType field if using Array type.');
                    }

                    // If the array is to hold strings
                    if (fieldInfo.arrayType === 'string') {
                        // Make a new pointed string array
                        value = new PointedArray<string>();
                    }
                    // If the array is to hold documents
                    else {
                        // Make a new pointed document array
                        value = new PointedArray<EditableDocument>();
                    }
                    break;
                }
                // If the field is a string
                case 'string': {
                    // Just give it an empty string (which will be treated as undefined)
                    value = '';
                    break;
                }
                // If the field is a boolean value
                case 'boolean': {
                    // Initialize to false
                    value = false;
                    break;
                }
            }

            // Add the current field to the document's fields
            this.fields.set(key, {
                fieldInfo: fieldInfo,
                value: value
            });
            // Add the name to the pointed array
            this.fieldNames.push(key);
        }
    }

    // Concisely display the fields of the document
    public toString(): string {
        let content = '';
        for (const field of this.fields.values()) {
            content += `${field.fieldInfo.alias}: ${field.value || '*None*'}\n`;
        }
        return content;
    }

    // Get the currently selected field within the document
    public getSelection(): EditableDocumentField {
        const selected = this.fields.get(this.fieldNames.selection());
        if (!selected) {
            throw new Error('An editable document returned nothing when retrieving its selection.');
        }

        return selected;
    }
}