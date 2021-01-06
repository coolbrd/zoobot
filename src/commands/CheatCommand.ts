import BeastiaryClient from "../bot/BeastiaryClient";
import { GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class CheatCommand extends GuildCommand {
    public readonly names = ["cheat"];

    public readonly info = "Get a bunch of money and shit";

    public readonly helpUseString = "to win.";

    public readonly adminOnly = true;

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const testRolls = await beastiaryClient.beastiary.encounters.testRollSpecies(1000);

        for (const [species, count] of testRolls.entries()) {
            console.log(`${species.commonNames[0]}: ${count} (T${species.rarityTier})`);
        }

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        player.pep += 9999999999;
        player.collectionUpgradeLevel += 9999999999;
        player.extraEncountersLeft += 9999999999;
        player.extraCapturesLeft += 9999999999;
        player.extraXpBoostsLeft += 9999999999;
        player.playerPremium = !player.playerPremium;

        console.log(`${player.member.user.username} just cheated!`);

        const commandReceipt = this.newReceipt();
        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new CheatCommand();