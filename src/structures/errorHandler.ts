import { client } from "..";
import { DEVELOPER_ID } from "../config/secrets";

class ErrorHandler {
    public handleError(error: Error, message?: string): void {
        console.error(message || 'Error message from the centralized error-handling component', error);

        const developer = client.users.resolve(DEVELOPER_ID);

        console.log(developer)

        if (!developer) {
            throw new Error('Developer user could not be found for error handler.');
        }

        developer.send(error.message);
    }

    public isTrustedError(_error: Error) {
        return false;
    }
}
export const errorHandler = new ErrorHandler();