import { stripIndent } from "common-tags";
import { client } from "..";
import Command from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class ExitCommand extends Command {
    public readonly commandNames = ["exit"];

    public readonly info = "Shuts down the bot";

    public readonly helpUseString = "to shut down to bot.";

    public readonly adminOnly = true;

    public async run(_parsedMessage: CommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        console.log("Exiting...");

        if (!client.shard) {
            throw new Error(stripIndent`
                Client shard value undefined.
            `);
        }

        client.shard.broadcastEval(`
            this.emit("exit");
        `);

        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new ExitCommand();