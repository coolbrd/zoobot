// A set of informational fields pertaining to a field of a document
export interface FieldInfo {
    // The human-formatted name of the field
    alias: string,
    // The description of the field
    prompt: string,
    // Whether or not the field can take multiple entries
    multiple?: boolean,
    // The string to separate multiple entries by, if the field has multiple of them
    delimiter?: string
}

// A set of field information. Usually used to describe an entire document.
export interface FieldInfoBundle {
    [path: string]: FieldInfo
}

// A set of field information, along with whether or not each field is necessary to input
// Used when gathering user input for something that will eventually become a document
export interface UserInputBundle {
    [path: string]: {
        fieldInfo: FieldInfo,
        required: boolean
    }
}

// A set of responses to be returned from user input gathering functions
export interface UserInputResponses {
    [path: string]: string | string[]
}