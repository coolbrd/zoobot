import { client } from "..";
import { DEVELOPER_ID } from "../config/secrets";
import { betterSend } from "../discordUtility/messageMan";

class ErrorHandler {
    public handleError(error: Error, message?: string): void {
        console.error(message || 'Error message from the centralized error-handling component', error);

        const developer = client.users.resolve(DEVELOPER_ID);

        if (!developer) {
            throw new Error('Developer user could not be found for error handler.');
        }

        if (!developer.dmChannel) {
            throw new Error('Could not access DM channel with developer.');
        }

        betterSend(developer.dmChannel, error.message);
    }

    public isTrustedError(_error: Error) {
        return false;
    }
}
export const errorHandler = new ErrorHandler();