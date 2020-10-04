import { DMChannel, TextChannel } from "discord.js";
import { client } from "..";
import { DEVELOPER_ID } from "../config/secrets";
import { betterSend } from "../discordUtility/messageMan";

class ErrorHandler {
    private readonly developerChannel: DMChannel;

    constructor() {
        const developer = client.users.resolve(DEVELOPER_ID);

        if (!developer) {
            throw new Error('Developer user could not be found for error handler.');
        }

        if (!developer.dmChannel) {
            throw new Error('Could not access DM channel with developer.');
        }

        this.developerChannel = developer.dmChannel;
    }

    public handleError(error: Error): void {
        console.error(
            'Error message from the centralized error-handling component',
            error,
        );
        
        betterSend(this.developerChannel, error.message);
    }

    public isTrustedError(_error: Error) {
        return false;
    }
}
export const errorHandler = new ErrorHandler();