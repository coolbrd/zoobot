import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import handleUserError from "../discordUtility/handleUserError";
import TokenDisplayMessage from "../messages/TokenDisplayMessage";
import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Player } from "../structures/GameObject/GameObjects/Player";

class ViewTokensCommand extends GuildCommand {
    public readonly names = ["tokens"];

    public readonly info = "View your collected species tokens";

    public readonly helpUseString = "to see every token you've collected.";

    public readonly section = CommandSection.playerInfo;

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "user tag or id",
            optional: true,
            default: "you"
        }
    ];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        let player: Player;
        try {
            player = await beastiaryClient.beastiary.players.fetchByGuildCommandParser(parsedMessage);
        }
        catch (error) {
            handleUserError(parsedMessage.channel, error);
            return commandReceipt;
        }

        const tokenMessage = new TokenDisplayMessage(parsedMessage.channel, beastiaryClient, player);
        try {
            await tokenMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a token display message.

                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new ViewTokensCommand();