import BeastiaryClient from "../bot/BeastiaryClient";
import handleUserError from "../discordUtility/handleUserError";
import { GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Player } from "../structures/GameObject/GameObjects/Player";

class CheatCommand extends GuildCommand {
    public readonly names = ["cheat"];

    public readonly info = "Get a bunch of money and shit";

    public readonly helpUseString = "to win.";

    public readonly adminOnly = true;

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

        player.pep += 9999999999;
        player.collectionUpgradeLevel += 9999999999;
        player.extraEncountersLeft += 9999999999;
        player.extraCapturesLeft += 9999999999;
        player.extraXpBoostsLeft += 9999999999;
        player.playerPremium = !player.playerPremium;

        console.log(`${player.username} just cheated!`);

        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new CheatCommand();