import { Client, User } from "discord.js";
import { DEVELOPER_ID } from "../config/secrets";

// The central error handler for gracefully responding to errors
class ErrorHandler {
    private _developer: User | undefined;

    public async init(client: Client): Promise<void> {
        // Get the developer user
        let developer: User;
        try {
            developer = await client.users.fetch(DEVELOPER_ID);
        }
        catch (error) {
            throw new Error(`There was an error fetching the developer user in the error handler: ${error}`);
        }

        // If the developer user couldn't be found
        if (!developer) {
            throw new Error("Developer user could not be found for error handler.");
        }

        this._developer = developer;
    }

    private get developer(): User {
        if (!this._developer) {
            throw new Error("Developer user in error handler is undefined.");
        }

        return this._developer;
    }

    // Do appropriate error-handling stuff
    public handleError(error: Error, message?: string): void {
        console.error(message || "Error message from the centralized error-handling component", error);

        this.developer.send(error);
    }
}
export const errorHandler = new ErrorHandler();