import { Client, User } from "discord.js";
import { DEVELOPER_ID } from "../config/secrets";

class ErrorHandler {
    private developer: User | undefined;

    public init(client: Client): void {
        const developer = client.users.resolve(DEVELOPER_ID);

        if (!developer) {
            throw new Error('Developer user could not be found for error handler.');
        }

        this.developer = developer;
    }

    private getDeveloper(): User {
        if (!this.developer) {
            throw new Error('Developer user in error handler is undefined.');
        }

        return this.developer;
    }

    public handleError(error: Error, message?: string): void {
        console.error(message || 'Error message from the centralized error-handling component', error);

        this.getDeveloper().send(error.message);
    }

    public isTrustedError(_error: Error) {
        return false;
    }
}
export const errorHandler = new ErrorHandler();