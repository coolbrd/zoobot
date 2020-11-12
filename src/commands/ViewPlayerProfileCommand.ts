import { stripIndents } from "common-tags";
import { beastiary } from "../beastiary/Beastiary";
import handleUserError from "../discordUtility/handleUserError";
import PlayerProfileMessage from "../messages/PlayerProfileMessage";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class ViewPlayerProfileCommand extends GuildCommand {
    public readonly commandNames = ["profile", "p"];

    public readonly info = "View you or another player's profile";

    public readonly helpUseString = "to view your profile.";

    public readonly section = CommandSection.playerInfo;

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        let player: Player;
        try {
            player = await beastiary.players.fetchByGuildCommandParser(parsedMessage);
        }
        catch (error) {
            handleUserError(parsedMessage.channel, error);
            return commandReceipt;
        }

        const playerProfileMessage = new PlayerProfileMessage(parsedMessage.channel, player);

        try {
            await playerProfileMessage.send();
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error sending a profile message.

                Profile message: ${JSON.stringify(playerProfileMessage)}
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new ViewPlayerProfileCommand();