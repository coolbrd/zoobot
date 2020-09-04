import clone from "clone";

import { PointedArray } from "./pointedArray";
import { capitalizeFirstLetter } from "./toolbox";
import { Schema } from "mongoose";

type EditableDocumentPrimitive = string | number | boolean;

// A set of informational fields pertaining to a field of a document
interface EditableDocumentFieldInfo {
    // The human-formatted name of the field
    alias: string,
    // The optional prompt for informing the user about input guidelines
    prompt?: string,
    type: 'document' | 'array' | 'string' | 'boolean' | 'number',
    // Whether or not the document will submit without this field
    required?: boolean,
    // The max length, in characters, that the field is allowed to be (only applies to strings and string arrays)
    maxLength?: number,
    // The type of document, used if the type is 'document'
    documentType?: EditableDocumentSkeleton,
    // The type stored within the array, used if the type is 'array'
    arrayType?: EditableDocumentSkeleton | 'string',
    // The size of the array's viewport
    arrayViewPortSize?: number
}

// The skeleton of an object that may go inside of an EditableDocumentSkeleton
export interface EditableDocumentObjectSkeleton {
    [path: string]: EditableDocumentPrimitive | EditableDocumentSkeleton | string[] | undefined
}

// A blueprint used to construct a new empty editable document
export interface EditableDocumentSkeleton {
    [path: string]: {
        fieldInfo: EditableDocumentFieldInfo,
        value?: EditableDocumentPrimitive | EditableDocumentObjectSkeleton | EditableDocumentObjectSkeleton[] | EditableDocumentSkeleton | string[] | undefined
    }
}

// A single field within a document. Contains both the given field info and the value to eventually be set.
export interface EditableDocumentField {
    fieldInfo: EditableDocumentFieldInfo,
    value: EditableDocumentPrimitive | EditableDocument | PointedArray<EditableDocument | string>;
}

// The simple, non-pointed form of an EditableDocument
// Used as a return type when getting an EditableDocument that has been submitted
export interface SimpleDocument {
    [path: string]: EditableDocumentPrimitive | SimpleDocument | string[] | undefined
}

// A document containing a set of fields that can be edited through some given user interface
export default class EditableDocument {
    // The document's fields
    private readonly fields = new Map<string, EditableDocumentField>();
    // The names of the document's fields, in a pointed array so the fields can be loosely indexed for user pointer selection
    private readonly fieldNames = new PointedArray<string>();

    // Create a new document from a given skeleton
    constructor(skeleton: EditableDocumentSkeleton) {
        // Don't accept empty skeletons
        if (skeleton === {}) {
            throw new Error('Cannot form a new EditableDocument from an empty object');
        }

        // Iterate over every field in the skeleton
        for (const [key, field] of Object.entries(skeleton)) {
            // The default value that will be assigned to this field
            let value: EditableDocumentPrimitive | EditableDocument | PointedArray<EditableDocument | string>;

            // Field type behavior
            switch (field.fieldInfo.type) {
                // If the field is a document
                case 'document': {
                    // Make sure the document's type (skeleton) is provided
                    if (!field.fieldInfo.documentType || typeof field.fieldInfo.documentType !== 'object') {
                        throw new Error('Must supply an EditableDocumentSkeleton in the documentType field if using Document type.');
                    }

                    // The document's type, which may or may not need some values inserted into it
                    const completeSkeleton = field.fieldInfo.documentType;

                    // If a default value was provided
                    if (field.value) {
                        // Make sure the value is an object
                        if (typeof field.value !== 'object') {
                            throw new Error('Non-object value given to an EditableDocumentSkeleton object field.')
                        }

                        // Iterate over every field in the default value object
                        for (const [key, value] of Object.entries(field.value)) {
                            // Update the skeleton to reflect the desired default values
                            completeSkeleton[key].value = value;
                        }
                    }

                    // Initialize the document using default values if necessary
                    value = new EditableDocument(completeSkeleton);
                    break;
                }
                // If the field is an array
                case 'array': {
                    // Make sure the array's type is provided
                    if (!field.fieldInfo.arrayType) {
                        throw new Error('Must supply a type in the arrayType field if using Array type.');
                    }

                    if (field.value !== undefined && !Array.isArray(field.value)) {
                        throw new Error('Non-array value given to an EditableDocumentSkeleton array field.')
                    }

                    // If the array is to hold strings
                    if (field.fieldInfo.arrayType === 'string') {
                        // If a value was supplied (an array), and any of those values aren't strings
                        if (field.value && field.value.some((element: unknown) => { return typeof element !== 'string' })) {
                            throw new Error('Array of type other than string given to an EditableDocumentSkeleton string array field.');
                        }

                        // Make a new pointed string array
                        value = new PointedArray<string>(field.value as string[], { viewSize: field.fieldInfo.arrayViewPortSize });
                    }
                    // If the array is to hold documents
                    else {
                        // Initialize an array that will get filled if default values were supplied
                        const documentArray: EditableDocument[] = [];

                        // If a default value was supplied
                        if (field.value) {
                            // If one of its elements isn't a document
                            if (field.value.some((element: unknown) => { return typeof element !== 'object' })) {
                                throw new Error('Array of type other than object given to an EditableDocumentSkeleton object array field.');
                            }

                            // Iterate over every value in the array of documents
                            for (const documentValue of field.value) {
                                // Create a new skeleton to put values in (based on the document type of the array)
                                // This needs to be cloned so that the original values of the array's type aren't altered
                                const currentDocumentSkeleton = clone(field.fieldInfo.arrayType);
                                
                                // Iterate over every field in the current document value
                                for (const [key, value] of Object.entries(documentValue)) {
                                    // Assign the current skeleton the same default values
                                    currentDocumentSkeleton[key].value = value;
                                }

                                // Add a new editable document that's based on the array's type and the default information to the array
                                documentArray.push(new EditableDocument(currentDocumentSkeleton));
                            }
                        }

                        // Make a new pointed document array based on the default values (if any)
                        value = new PointedArray<EditableDocument>(documentArray, { viewSize: field.fieldInfo.arrayViewPortSize });
                    }
                    break;
                }
                // If the field is a string
                case 'string': {
                    if (field.value && typeof field.value !== 'string') {
                        throw new Error('Non-string value given to an EditableDocumentSkeleton string field.');
                    }

                    value = field.value || '';
                    break;
                }
                // If the field is a boolean value
                case 'boolean': {
                    if (field.value && typeof field.value !== 'boolean') {
                        throw new Error('Non-boolean value given to an EditableDocumentSkeleton boolean field.');
                    }

                    value = field.value === undefined ? false : field.value;
                    break;
                }
                case 'number': {
                    if (field.value && typeof field.value !== 'number') {
                        throw new Error('Non-boolean value given to an EditableDocumentSkeleton boolean field.');
                    }

                    value = field.value === undefined ? 0 : field.value;
                    break;
                }
                default: {
                    throw new Error('Invalid type supplied to an EditableDocumentSkeleton.');
                }
            }

            // Add the current field to the document's fields
            this.fields.set(key, {
                fieldInfo: field.fieldInfo,
                value: value
            });
            // Add the name to the pointed array
            this.fieldNames.push(key);
        }
    }

    // Concisely display the fields of the document
    public toString(delimiter?: string): string {
        let content = '';
        let fieldIndex = 0;
        for (const field of this.fields.values()) {
            const currentDelimiter = fieldIndex < this.fields.size - 1 ? (delimiter ? delimiter : '\n') : '';
            content += `${capitalizeFirstLetter(field.fieldInfo.alias)}: ${field.value || '*None*'}${currentDelimiter}`;
            fieldIndex++;
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

    // Gets the name of the currently selected field
    public getSelectedFieldName(): string {
        return this.fieldNames.selection();
    }

    // Gets an iterator of every field in this document
    public getFieldEntries(): IterableIterator<[string, EditableDocumentField]> {
        return this.fields.entries();
    }

    // Moves the pointer up one
    public incrementPointer(): void {
        this.fieldNames.incrementPointer();
    }

    // Moves the pointer down one
    public decrementPointer(): void {
        this.fieldNames.decrementPointer();
    }

    // Makes sure that all requirements are met, as indicated by each field's optional "required" property
    public requirementsMet(): boolean {
        // Check every field for validity
        for (const field of this.fields.values()) {
            // If the field is not required, don't bother checking it because it doesn't matter
            if (!field.fieldInfo.required) {
                continue;
            }

            // If the field is an array
            if (field.value instanceof PointedArray) {
                // If the array is empty
                if (field.value.length < 1) {
                    return false;
                }

                if (typeof field.fieldInfo.arrayType === 'object') {
                    return !field.value.some((element: EditableDocument) => {
                        return !element.requirementsMet();
                    });
                }
            }
            // If the field is a document
            else if (field.value instanceof EditableDocument) {
                // Return whether or not the document's requirements are met
                return field.value.requirementsMet();
            }
            // If the field is a string, make sure it's not empty or undefined
            else if (typeof field.value === 'string' && !field.value) {
                return false;
            }
            // If the field is a boolean value, make sure it's not undefined (I'm not even sure if it can be)
            else if (typeof field.value === 'boolean' && field.value === undefined) {
                return false;
            }
        }
        // If all above tests were passed, indicate that requirements have been met
        return true;
    }

    // Gets the EditableDocument's data as a simple object of the raw submitted data
    public getData(): SimpleDocument {
        // The final object to stuff and submit
        const finalObject: SimpleDocument = {};

        // Iterate over every field in this document
        for (const [key, field] of this.fields.entries()) {
            // The value that will be stored in this current field's simple analogue
            let storedValue: SimpleDocument | SimpleDocument[] | string[] | string | boolean | number | undefined;

            // If the current field's value is an array
            if (field.value instanceof PointedArray) {
                // Store the basic string array if it stores strings
                if (field.fieldInfo.arrayType === 'string') {
                    storedValue = field.value as string[];
                }
                // If the array contains other EditableDocuments
                else {
                    // Indicate that the value will be an array of simple documents
                    storedValue = [] as SimpleDocument[];
                    // Convert every editable document into its simple counterpart and add them to the array
                    for (const element of field.value as EditableDocument[]) {
                        storedValue.push(element.getData());
                    }
                }
            }
            // If the field's value is just another document
            else if (field.value instanceof EditableDocument) {
                // Store the simple version of the document
                storedValue = field.value.getData();
            }
            // If the field's value is a basic type
            else {
                // Just store the value itself
                storedValue = field.value;
            }

            // Add the current property to the simple document
            Object.defineProperty(finalObject, key, {
                value: storedValue,
                writable: false,
                enumerable: true
            });
        }

        return finalObject;
    }
}

interface EditableDocumentSkeletonInfo {
    [path: string]: {
        alias: string,
        prompt?: string,
        maxLength?: number,
        arrayViewPortSize?: number,
        nestedInfo?: EditableDocumentSkeletonInfo
    }
}

// Takes a Mongoose schema and some information about each field to include, and combines them into an EditableDocumentSkeleton
export function schemaToSkeleton(schema: Schema, info: EditableDocumentSkeletonInfo): EditableDocumentSkeleton {
    const skeleton: EditableDocumentSkeleton = {};

    // Iterate over every field in the info objext
    for (const [key, value] of Object.entries(info)) {
        // If the current info field's key isn't also in the schema
        if (!(key in schema.obj)) {
            throw new Error('Field name found in info skeleton not found in Mongoose schema.');
        }

        // The type to assign for the current field in the skeleton
        let fieldType: 'string' | 'number' | 'array' | 'document';
        // The optional type of the array to assign to the current field in the skeleton (only if it's an array)
        let fieldArrayType: EditableDocumentSkeleton | 'string' | undefined;
        // The optional document type of this field
        let fieldDocumentType: EditableDocumentSkeleton | undefined;

        const schemaFieldType = schema.obj[key].type;
        if (schemaFieldType === String) {
            fieldType = 'string';
        }
        else if (schemaFieldType === Number) {
            fieldType = 'number';
        }
        else if (schemaFieldType === Array || schemaFieldType === [String]) {
            fieldType = 'array';
            fieldArrayType = 'string';
        }
        // If the field is a nested document
        else if (schemaFieldType instanceof Schema) {
            if (!value.nestedInfo) {
                throw new Error('Field info must be provided in the nestedInfo field for fields containing documents.');
            }

            fieldType = 'document';
            // Set its type to a skeleton created from the subschema
            fieldDocumentType = schemaToSkeleton(schemaFieldType, value.nestedInfo)
        }
        else if (Array.isArray(schemaFieldType) && schemaFieldType.length > 0 && schemaFieldType[0] instanceof Schema) {
            if (!value.nestedInfo) {
                throw new Error('Field info must be provided in the nestedInfo field for fields containing arrays of documents.');
            }

            fieldType = 'array';
            fieldArrayType = schemaToSkeleton(schemaFieldType[0], value.nestedInfo);
        }
        else {
            throw new Error('Unsupported type encountered in schema upon trying to convert to an EditableDocumentSkeleton');
        }

        // Add the field to the skeleton
        Object.defineProperty(skeleton, key, {
            value: {
                fieldInfo: {
                    alias: value.alias,
                    prompt: value.prompt,
                    type: fieldType,
                    required: schema.obj[key].required,
                    maxLength: value.maxLength,
                    arrayViewPortSize: value.arrayViewPortSize,
                    arrayType: fieldArrayType,
                    documentType: fieldDocumentType
                }
            },
            writable: false,
            enumerable: true
        });
    }

    return skeleton;
}