import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { remainingTimeString } from "../utility/timeStuff";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";

class ViewResetsCommand extends GuildCommand {
    public readonly names = ["resets", "rs"];

    public readonly info = "View the time remaining until the next free encounter and capture resets";

    public readonly helpUseString = "to view the time until the next encounter and capture resets, along with the number of encounters and captures you have left.";

    public readonly section = CommandSection.playerInfo;

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);
        
        let messageString = `You have **${player.encountersLeft}** encounter${player.encountersLeft === 1 ? "" : "s"} left`;
        messageString += ` (**${player.freeEncountersLeft}** free, **${player.extraEncountersLeft}** extra)\n`
        messageString += `Next encounter reset: **${remainingTimeString(beastiaryClient.beastiary.resets.nextEncounterReset)}**\n\n`;

        messageString += `You have **${player.capturesLeft}** capture${player.capturesLeft === 1 ? "" : "s"} left`;
        messageString += ` (**${player.freeCapturesLeft}** free, **${player.extraCapturesLeft}** extra)\n`
        messageString += `Next capture reset: **${remainingTimeString(beastiaryClient.beastiary.resets.nextCaptureReset)}**\n\n`;

        messageString += `You have **${player.xpBoostsLeft}** xp boost${player.freeXpBoostsLeft === 1 ? "" : "s"} left`;
        messageString += ` (**${player.freeXpBoostsLeft}** free, **${player.extraXpBoostsLeft}** extra)\n`;
        messageString += `Next xp boost reset: **${remainingTimeString(beastiaryClient.beastiary.resets.nextXpBoostReset)}**\n\n`;

        if (player.hasDailyCurrencyReset) {
            messageString += `You can claim your daily pep right now!`;
        }
        else {
            messageString += `You've claimed your daily pep today. Next daily reset: **${remainingTimeString(beastiaryClient.beastiary.resets.nextDailyCurrencyReset)}**`;
        }

        betterSend(parsedMessage.channel, messageString);

        return commandReceipt;
    }
}
export default new ViewResetsCommand();