import { stripIndent } from "common-tags";
import { beastiary } from "../beastiary/Beastiary";
import TokenDisplayMessage from "../messages/TokenDisplayMessage";
import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Player } from "../structures/GameObject/GameObjects/Player";

class ViewTokensCommand extends GuildCommand {
    public readonly commandNames = ["tokens"];

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

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        let player: Player;
        try {
            player = await beastiary.players.fetchByGuildCommandParser(parsedMessage);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player in the token view command.

                Parsed message: ${JSON.stringify(parsedMessage)}

                ${error}
            `);
        }

        const tokenMessage = new TokenDisplayMessage(parsedMessage.channel, player);
        try {
            await tokenMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a token display message.

                Token display message: ${JSON.stringify(tokenMessage)}

                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new ViewTokensCommand();