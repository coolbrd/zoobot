import { exit } from "..";
import Command from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { errorHandler } from "../structures/ErrorHandler";

class ExitCommand extends Command {
    public readonly commandNames = ["exit"];

    public readonly info = "Shuts down the bot";

    public readonly adminOnly = true;

    public help(_displayPrefix: string): string {
        return `Why do you need help with this? It's pretty straightforward.`;
    }

    public async run(_parsedMessage: CommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        console.log("Exiting...");

        try {
            await exit();
        }
        catch (error) {
            errorHandler.handleError(error, "There was an error exiting the bot process in the exit command.");
            return commandReceipt;
        }

        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new ExitCommand();