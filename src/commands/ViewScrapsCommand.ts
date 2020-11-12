import { beastiary } from "../beastiary/Beastiary";
import handleUserError from "../discordUtility/handleUserError";
import { betterSend } from "../discordUtility/messageMan";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class ViewScrapsCommand extends GuildCommand {
    public readonly commandNames = ["scraps", "scrap", "s"];

    public readonly info = "View your current balance of scraps";

    public readonly helpUseString = "to view your current balance of scraps.";

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

        betterSend(parsedMessage.channel, `${player.member.displayName}'s balance: **${player.scraps}** scraps.`);

        return commandReceipt;
    }
}
export default new ViewScrapsCommand();