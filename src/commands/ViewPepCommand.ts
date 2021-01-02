import handleUserError from "../discordUtility/handleUserError";
import { betterSend } from "../discordUtility/messageMan";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";

class ViewPepCommand extends GuildCommand {
    public readonly names = ["pep", "vp"];

    public readonly info = "View your current balance of pep";

    public readonly helpUseString = "to view your current balance of pep.";

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

        const pepEmoji = beastiaryClient.beastiary.emojis.getByName("pep");
        betterSend(parsedMessage.channel, `${player.member.displayName}'s balance: **${player.pep}**${pepEmoji}.`);

        return commandReceipt;
    }
}
export default new ViewPepCommand();