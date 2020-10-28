import { client, exit } from "..";
import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { errorHandler } from "../structures/ErrorHandler";

// Initiates the exit process
export default class ExitCommand extends Command {
    public readonly commandNames = ["exit"];

    public readonly info = "Shuts down the bot";

    public readonly adminOnly = true;

    public readonly reactConfirm = true;

    public help(_displayPrefix: string): string {
        return `Why do you need help with this? It's pretty straightforward.`;
    }

    public async run(_parsedMessage: CommandParser): Promise<boolean> {
        console.log("Exiting...");

        client.destroy()

        try {
            await exit();
        }
        catch (error) {
            errorHandler.handleError(error, "There was an error exiting the bot process in the exit command.");
            return false;
        }

        return true;
    }
}