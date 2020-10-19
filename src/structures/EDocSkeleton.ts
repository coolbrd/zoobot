// The accepted types found within a declaration of an eDoc's field
// Arrays of any value found in a normal field are allowed, but the type declaration needs to be an array of field information
// For example, a string array would not be [String], it would be a field object (with String in the type field) in brackets
export type EDocTypeHint = StringConstructor | NumberConstructor | EDocSkeleton | [EDocFieldInfo];

// The set of information that goes with every eDoc field
export interface EDocFieldInfo {
    // The field's value's type
    type: EDocTypeHint,
    // Whether or not the value is marked as being required for completion
    required?: boolean,
    // The human-friendly string to display as the name of this field
    alias?: string,
    // The text that prompts the user for input for this field
    prompt?: string,
    // Whether or not to display this field
    hidden?: boolean,
    // Options for what constitutes valid string input, and what to do with string input
    stringOptions?: {
        // The string value's max length, in characters
        maxLength?: number,
        // The case to normalize any string input to
        forceCase?: "lower" | "upper"
    },
    // Options for what constitutes valid number input, and what to do with number input
    numberOptions?: {
        // The acceptable range of number input
        min?: number,
        max?: number
    },
    // Options for array behavior
    arrayOptions?: {
        // The minimum number of elements required to satisfy an array that's marked as required (defaults to 1)
        minimumLength?: number,
        // The maximum number of elements to show at once
        viewportSize?: number
    },
    // Options for document behavior
    documentOptions?: {
        // The name of the field's value to display instead of "<name> document"
        displayField?: string
    }
}

// A set of eDoc field information, used in the creation of eDoc instances and nested eDocs
export default interface EDocSkeleton {
    [fieldName: string]: EDocFieldInfo
}

// Reduces an eDoc type hint to a simple string
export function getEDocTypeString(fieldType: EDocTypeHint): "string" | "number" | "array" | "edoc" {
    switch (fieldType) {
        case String: {
            return "string";
        }
        case Number: {
            return "number";
        }
        // Consider possible general object types
        default: {
            if (Array.isArray(fieldType)) {
                return "array";
            }
            else {
                return "edoc";
            }
        }
    }
}