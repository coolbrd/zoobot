// Used to gather input from the user easily with the awaitMessages method
// Can take either a continuous array of string inputs or just one
export interface UserInputField {
    type: ArrayConstructor | StringConstructor,
    required: boolean,
    prompt: string,
    info: string
}

// This input interface is built heavily with Mongoose's SchemaDefinition in mind, as UserInputBundle can be safely converted to SchemaDefinition and turned into a model
// This was done primarily to reduce repition in the definition of user input fields and their corresponding schema definitions
export interface UserInputBundle {
    [path: string]: UserInputField
}

// A set of responses to be returned from user input gathering functions
export interface UserInputResponses {
    [path: string]: string | string[]
}