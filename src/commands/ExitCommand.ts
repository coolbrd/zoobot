import BeastiaryClient from "../bot/BeastiaryClient";
import Command from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class ExitCommand extends Command {
    public readonly names = ["exit"];

    public readonly info = "Shuts down the bot";

    public readonly helpUseString = "to shut down to bot.";

    public readonly adminOnly = true;

    public async run(_parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        console.log("Exiting...");

        if (!beastiaryClient.discordClient.shard) {
            throw new Error("A client's shard value was undefined at the time the exit command was run.");
        }

        beastiaryClient.discordClient.shard.broadcastEval(`
            this.emit("exit");
        `);

        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new ExitCommand();