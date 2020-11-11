import { beastiary } from "../beastiary/Beastiary";
import { encounterHandler } from "../beastiary/EncounterHandler";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { remainingTimeString } from "../utility/timeStuff";

export default class ViewResetsCommand extends GuildCommand {
    public readonly commandNames = ["resets", "rs"];

    public readonly info = "View the time remaining until the next free encounter and capture resets";

    public readonly section = CommandSection.playerInfo;

    public help(displayPrefix: string): string {
        return `Use ${displayPrefix}${this.commandNames[0]} to view the time until the next encounter and capture resets, along with the number of encounters and captures you have left`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        let player: Player;
        try {
            player = await beastiary.players.fetch(getGuildMember(parsedMessage.sender, parsedMessage.guild));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player from the cache in the resets command: ${error}`);
        }
        
        let messageString = `You have **${player.encountersLeft}** encounter${player.encountersLeft === 1 ? "" : "s"} left`;

        messageString += ` (**${player.freeEncountersLeft}** free, **${player.extraEncountersLeft}** extra)\n`
        messageString += `Next encounter reset: **${remainingTimeString(encounterHandler.nextEncounterReset)}**\n\n`;

        messageString += `You have **${player.capturesLeft}** capture${player.capturesLeft === 1 ? "" : "s"} left`;

        messageString += ` (**${player.freeCapturesLeft}** free, **${player.extraCapturesLeft}** extra)\n`
        messageString += `Next capture reset reset: **${remainingTimeString(encounterHandler.nextCaptureReset)}**`;

        betterSend(parsedMessage.channel, messageString);
    }
}