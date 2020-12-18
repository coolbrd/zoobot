import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import EssenceDisplayMessage from "../messages/EssenceDisplayMessage";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class ViewEssenceCommand extends GuildCommand {
    public readonly names = ["essence"];

    public readonly info = "View your balance of essences";

    public readonly helpUseString = "to see all the essence you've collected from every species.";

    public readonly section: CommandSection = CommandSection.playerInfo;

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        const essenceDisplayMessage = new EssenceDisplayMessage(parsedMessage.channel, beastiaryClient, player);

        try {
            await essenceDisplayMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending an essence display message.

                Player: ${player.debugString}

                ${error}
            `);
        }

        return this.newReceipt();
    }
}
export default new ViewEssenceCommand();