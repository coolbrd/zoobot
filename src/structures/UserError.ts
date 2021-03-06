// A special little error class designated specifically for errors that should be displayed to the user
// Used primarily when something goes wrong in a command due to user input and a clarifying message needs to be sent
export default class UserError implements Error {
    public readonly name = "UserError";
    public readonly message: string;

    constructor(message: string) {
        this.message = message;
    }
}