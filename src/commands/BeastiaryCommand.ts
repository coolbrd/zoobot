import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import BeastiaryMessage from "../messages/BeastiaryMessage";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class BeastiaryCommand extends GuildCommand {
    public readonly names = ["beastiary", "bestiary", "b"];

    public readonly info = "View the list of all species available in The Beastiary";

    public readonly helpUseString = "to view a list of every collectible species.";

    public readonly sections = [CommandSection.gettingStarted, CommandSection.gameplay, CommandSection.info];

    public async run(parsedUserCommand: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedUserCommand.member);
        
        const beastiaryMessage = new BeastiaryMessage(parsedUserCommand.channel, beastiaryClient, player);
        try {
            await beastiaryMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a beastiary message.
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new BeastiaryCommand();