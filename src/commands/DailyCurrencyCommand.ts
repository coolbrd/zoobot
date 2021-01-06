import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { remainingTimeString } from "../utility/timeStuff";

class DailyCurrencyCommand extends GuildCommand {
    public readonly names = ["daily", "dailypep", "dp"];

    public readonly info = "Claim some free daily pep";

    public readonly helpUseString = "to claim some free pep, if you haven't already today.";

    public readonly sections = [CommandSection.gettingStarted, CommandSection.gameplay];

    public readonly blocksInput = true;

    private getRandomDailyAmount(): number {
        const x = Math.random() * 100;

        const dailyAmount = Math.floor(50 * Math.tan((Math.PI * x) / 204) + x + 150);

        return dailyAmount;
    }

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        if (!player.hasDailyPepReset) {
            const nextDay = new Date();
            nextDay.setDate(nextDay.getDate() + 1);
            nextDay.setHours(0);
            nextDay.setMinutes(0);
            nextDay.setSeconds(0);
            nextDay.setMilliseconds(0);

            betterSend(parsedMessage.channel, `You've already claimed your daily pep today. Next day begins in **${remainingTimeString(nextDay)}**.`);
            return commandReceipt;
        }

        player.claimDailyPep();

        const dailyAmount = this.getRandomDailyAmount();

        player.pep += dailyAmount;

        const pepEmoji = beastiaryClient.beastiary.emojis.getByName("pep");
        betterSend(parsedMessage.channel, `Success, you got **${dailyAmount}**${pepEmoji}!`);
        return commandReceipt;
    }
}
export default new DailyCurrencyCommand();