import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import Command from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class FakeVoteCommand extends Command {
    public readonly names = ["fakevote", "fv"];

    public readonly info = "Induce a fake vote even for a user id";

    public readonly helpUseString = "`<id>` `<count>` to induce a vote from a user id with a specific number of prize balls.";

    public readonly adminOnly = true;

    public async run(parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, "You need to specify the id to give a vote.");
            return receipt;
        }

        const id = parsedMessage.consumeArgument().userId;

        if (!id) {
            betterSend(parsedMessage.channel, `${id} is not an id.`);
            return receipt;
        }

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, "You need to specify a number of prize balls to give.");
            return receipt;
        }

        const count = Number(parsedMessage.consumeArgument().text);

        if (isNaN(count)) {
            betterSend(parsedMessage.channel, "Enter a numeric value for the number of prize balls to give.");
            return receipt;
        }

        console.log(`Giving a fake vote to ${id}`);
        try {
            await beastiaryClient.beastiary.players.handleVote(id, count);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error giving a fake vote to an id.

                Id: ${id}
                Count: ${count}

                ${error}
            `);
        }
        
        receipt.reactConfirm = true;
        return receipt;
    }
}
export default new FakeVoteCommand();