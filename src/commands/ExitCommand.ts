import { exit } from "..";
import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { errorHandler } from "../structures/ErrorHandler";

// Initiates the exit process
export default class ExitCommand implements Command {
    public readonly commandNames = ["exit"];

    public readonly info = "Shuts down the bot";

    public readonly adminOnly = true;

    public help(_displayPrefix: string): string {
        return `Why do you need help with this? It's pretty straightforward.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {

        try {
            await parsedUserCommand.originalMessage.react("✅");
        }
        catch (error) {
            errorHandler.handleError(error, "There was an error confirming the bot's exit by reacting to a message.");
        }
        finally {
            console.log("Exiting...");

            try {
                await exit();
            }
            catch (error) {
                errorHandler.handleError(error, "There was an error exiting the bot process in the exit command.");
            }
        }
    }
}