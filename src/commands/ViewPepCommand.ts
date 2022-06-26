import handleUserError from "../discordUtility/handleUserError";
import { betterSend } from "../discordUtility/messageMan";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";
import Emojis from "../beastiary/Emojis";

class ViewPepCommand extends GuildCommand {
    public readonly names = ["pep", "vp", "balance", "bal"];

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
            handleUserError(parsedMessage.channel, error as Error);
            return commandReceipt;
        }

        betterSend(parsedMessage.channel, `${player.username}'s balance: **${player.pep}**${Emojis.pep}.`);

        return commandReceipt;
    }
}
export default new ViewPepCommand();