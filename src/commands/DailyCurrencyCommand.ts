import { stripIndent } from "common-tags";
import { beastiary } from "../beastiary/Beastiary";
import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { remainingTimeString } from "../utility/timeStuff";

class DailyCurrencyCommand extends GuildCommand {
    public readonly commandNames = ["daily", "dailyscraps", "ds"];

    public readonly info = "Claim some free daily scraps";

    public readonly helpUseString = "to claim some free scraps, if you haven't already today.";

    public readonly section = CommandSection.gettingStarted;

    public readonly blocksInput = true;

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        let player: Player;
        try {
            player = await beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player by a guild member in the daily currency command.

                Guild member: ${parsedMessage.member}

                ${error}
            `);
        }

        if (!player.hasDailyCurrencyReset) {
            betterSend(parsedMessage.channel, `You've already claimed your daily currency today. Next reset: **${remainingTimeString(beastiary.resets.nextDailyCurrencyReset)}**`);
            return commandReceipt;
        }

        player.claimDailyCurrency();

        const dailyAmount = Math.floor(Math.random() * 50) + 25;

        player.scraps += dailyAmount;

        betterSend(parsedMessage.channel, `Success, you got +**${dailyAmount}** scraps!`);
        return commandReceipt;
    }
}
export default new DailyCurrencyCommand();