import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { remainingTimeString } from "../utility/timeStuff";

class DailyCurrencyCommand extends GuildCommand {
    public readonly commandNames = ["daily", "dailypep", "dp"];

    public readonly info = "Claim some free daily pep";

    public readonly helpUseString = "to claim some free pep, if you haven't already today.";

    public readonly section = CommandSection.gettingStarted;

    public readonly blocksInput = true;

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        let player: Player;
        try {
            player = await beastiaryClient.beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player by a guild member in the daily currency command.

                Guild member: ${parsedMessage.member}

                ${error}
            `);
        }

        if (!player.hasDailyCurrencyReset) {
            betterSend(parsedMessage.channel, `You've already claimed your daily currency today. Next reset: **${remainingTimeString(beastiaryClient.beastiary.resets.nextDailyCurrencyReset)}**`);
            return commandReceipt;
        }

        player.claimDailyCurrency();

        const dailyAmount = Math.floor(Math.random() * 200) + 100;

        player.pep += dailyAmount;

        const pepEmoji = beastiaryClient.beastiary.emojis.getByName("pep");
        betterSend(parsedMessage.channel, `Success, you got **${dailyAmount}**${pepEmoji}!`);
        return commandReceipt;
    }
}
export default new DailyCurrencyCommand();