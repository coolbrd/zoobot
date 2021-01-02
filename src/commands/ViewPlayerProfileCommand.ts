import { stripIndent } from "common-tags";
import handleUserError from "../discordUtility/handleUserError";
import PlayerProfileMessage from "../messages/PlayerProfileMessage";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";

class ViewPlayerProfileCommand extends GuildCommand {
    public readonly names = ["profile", "p"];

    public readonly info = "View you or another player's profile";

    public readonly helpUseString = "to view your profile.";

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "user identifier",
            info: "the tag or plain user id of the user you want to select",
            optional: true,
            default: "you"
        }
    ];

    public readonly sections = [CommandSection.gameplay];

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

        const playerProfileMessage = new PlayerProfileMessage(parsedMessage.channel, beastiaryClient, player);

        try {
            await playerProfileMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a profile message.
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new ViewPlayerProfileCommand();