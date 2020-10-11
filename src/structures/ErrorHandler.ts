import { Client, User } from "discord.js";
import { DEVELOPER_ID } from "../config/secrets";

class ErrorHandler {
    private developer: User | undefined;

    public async init(client: Client): Promise<void> {
        let developer: User;
        try {
            developer = await client.users.fetch(DEVELOPER_ID);
        }
        catch (error) {
            throw new Error(`There was an error fetching the developer user in the error handler: ${error}`);
        }

        if (!developer) {
            throw new Error("Developer user could not be found for error handler.");
        }

        this.developer = developer;
    }

    private getDeveloper(): User {
        if (!this.developer) {
            throw new Error("Developer user in error handler is undefined.");
        }

        return this.developer;
    }

    public handleError(error: Error, message?: string): void {
        console.error(message || "Error message from the centralized error-handling component", error);

        this.getDeveloper().send(error);
    }

    public isTrustedError(_error: Error) {
        return false;
    }
}
export const errorHandler = new ErrorHandler();