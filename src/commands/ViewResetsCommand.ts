import { betterSend } from "../discordUtility/messageMan";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { remainingTimeString } from "../utility/timeStuff";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";

class ViewResetsCommand extends GuildCommand {
    public readonly commandNames = ["resets", "rs"];

    public readonly info = "View the time remaining until the next free encounter and capture resets";

    public readonly helpUseString = "to view the time until the next encounter and capture resets, along with the number of encounters and captures you have left.";

    public readonly section = CommandSection.playerInfo;

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        let player: Player;
        try {
            player = await beastiaryClient.beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player from the cache in the resets command.

                Guild member: ${JSON.stringify(parsedMessage.member)}
                
                ${error}
            `);
        }
        
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