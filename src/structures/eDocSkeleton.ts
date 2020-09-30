// Acceptable values for an eDoc's declared type
// Types that are nested eDocs are simply declared in their simple skeletal form
// Array types are declared by wrapping any simple type in square brackets
// Arrays of eDocs must be declared with the document's field information (type, etc.), hence EDocFieldInfo appearing here
export type EDocPrimitiveType = StringConstructor | NumberConstructor;
export type EDocSimpleType = EDocPrimitiveType | [EDocSimpleType | EDocFieldInfo];
export type EDocTypeHint = EDocSimpleType | EDocSkeleton;

// Reduces an eDoc type hint to a simple string
export function getEDocTypeString(fieldType: EDocTypeHint): 'string' | 'number' | 'array' | 'edoc' {
    switch (fieldType) {
        case String: {
            return 'string';
        }
        case Number: {
            return 'number';
        }
        default: {
            if (Array.isArray(fieldType)) {
                return 'array';
            }
            else {
                fieldType;
                return 'edoc';
            }
        }
    }
}

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
    // Whether or not this field should be hidden from plain view (usually used to store immutable data for later programatic use)
    hidden?: boolean,
    // Options for what constitutes valid string input, and what to do with string input
    stringOptions?: {
        // The string value's max length, in characters
        maxLength?: number,
        // The case to normalize any string input to
        forceCase?: 'lower' | 'upper'
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
        // The size of the viewable portion of the array
        viewportSize?: number,
        // The alias for each element within the array
        elementAlias?: string
    },
    // Options for document behavior
    documentOptions?: {
        // The name of the field's value to display instead of "<name> document"
        displayField?: string
    }
}

// A set of eDoc field information, used in the creation of eDoc instances and nested eDocs
export interface EDocSkeleton {
    [fieldName: string]: EDocFieldInfo
}