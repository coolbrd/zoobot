import Emojis from "../beastiary/Emojis";
import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import VoteCommand from "./VoteCommand";

class OpenPrizeBallCommand extends GuildCommand {
    public readonly names = ["prizeball", "openprizeball", "openball", "pb"];

    public readonly info = "Open an exciting prize ball";

    public readonly helpUseString = "to open a prize ball you got from voting. What's inside?";

    public readonly sections = [CommandSection.gameplay];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();
        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        if (player.prizeBalls < 1) {
            betterSend(parsedMessage.channel, `You don't have any prize balls left. Earn more by voting with the \`${VoteCommand.primaryName}\` command!`);
            return receipt;
        }

        let x = Math.random() * 100;
        const encounters = Math.max(3, Math.floor((30 / (4 * x + 1)) - (x / 10) + 7));

        x = Math.random() * 100;
        const captures = Math.max(0, Math.floor((2 / ((x / 3) + 1)) - (x / 1000) + 0.5));

        x = Math.random() * 100;
        const xpBoosts = Math.max(0, Math.floor((10 / (x + 1)) - (x / 7) + 5));

        x = Math.random() * 100;
        const pep = Math.max(0, Math.floor((1000 / ((x / 2) + 1)) + 25));

        player.extraEncountersLeft += encounters;
        player.extraCapturesLeft += captures;
        player.extraXpBoostsLeft += xpBoosts;
        player.pep += pep;

        player.prizeBalls--;

        let prizeString = `${player.pingString} opened a **prize ball** and got...`;

        if (encounters) {
            prizeString += `\n+**${encounters}** encounters`;
            if (encounters > 13) {
                prizeString += ", wow!"
            }
        }

        if (captures) {
            prizeString += `\n+**${captures}** captures`;
            if (captures > 1) {
                prizeString += ", wow!"
            }
        }

        if (xpBoosts) {
            prizeString += `\n+**${xpBoosts}** xp boosts`;
            if (xpBoosts > 10) {
                prizeString += ", wow!"
            }
        }

        if (pep) {
            prizeString += `\n+**${pep}**${Emojis.pep}`;
            if (pep > 700) {
                prizeString += ", wow!"
            }
        }

        betterSend(parsedMessage.channel, prizeString);

        return receipt;
    }
}
export default new OpenPrizeBallCommand();