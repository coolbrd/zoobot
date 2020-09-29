// Acceptable values for an eDoc's declared type
// Types that are nested eDocs are simply declared in their simple skeletal form
// Array types are indicated by encapsulating any declared type in square brackets
export type EDocTypeHint = StringConstructor | NumberConstructor | EDocSkeleton | [EDocTypeHint];

// Reduces an eDoc type hint to a simple string
export function getEDocTypeString(type: EDocTypeHint): 'string' | 'number' | 'array' | 'edoc' {
    switch (type) {
        case String: {
            return 'string';
        }
        case Number: {
            return 'number';
        }
        default: {
            if (Array.isArray(type)) {
                return 'array';
            }
            else {
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
        viewportSize?: number
    }
}

// A set of eDoc field information, used in the creation of eDoc instances and nested eDocs
export interface EDocSkeleton {
    [fieldName: string]: EDocFieldInfo
}