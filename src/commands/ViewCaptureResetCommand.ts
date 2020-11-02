import { beastiary } from "../beastiary/Beastiary";
import { encounterHandler } from "../beastiary/EncounterHandler";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Player } from "../models/Player";
import { CommandSection, GuildCommand } from "../structures/Command";
import { GuildCommandParser } from "../structures/CommandParser";
import { remainingTimeString } from "../utility/timeStuff";

export default class ViewCaptureResetCommand extends GuildCommand {
    public readonly commandNames = ["capturereset", "captureperiod", "cr", "cp"];

    public readonly info = "View whether or not you can capture, and the time until the next capture reset";

    public readonly section = CommandSection.playerInfo;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` to view how many captures you have, and the amount of time until the next reset.`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        let player: Player;
        try {
            player = await beastiary.players.fetch(getGuildMember(parsedMessage.sender, parsedMessage.guild));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player from the cache in the encounter reset command: ${error}`);
        }
        
        let messageString = `You have **${player.capturesLeft}** captures${player.capturesLeft === 1 ? "" : "s"} left`;

        messageString += ` (**${player.freeCapturesLeft}** free, **${player.extraCapturesLeft}** extra)\n\n`
        messageString += `Next capture reset reset: **${remainingTimeString(encounterHandler.nextCaptureReset)}**.`;

        betterSend(parsedMessage.channel, messageString);
    }
}