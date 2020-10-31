import { beastiary } from "../beastiary/Beastiary";
import { encounterHandler } from "../beastiary/EncounterHandler";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Player } from "../models/Player";
import { CommandSection, GuildCommand } from "../structures/Command";
import { GuildCommandParser } from "../structures/CommandParser";
import { remainingTimeString } from "../utility/timeStuff";

// Displays a player's current number of encounters stored, plus the amount of time until the next free encounter reset
export default class ViewEncounterResetCommand extends GuildCommand {
    public readonly commandNames = ["encounterreset", "er", "encounterperiod", "ep"];

    public readonly info = "View your current number of encounters remaining, and the time until the next encounter reset";

    public readonly section = CommandSection.playerInfo;

    public help(displayPrefix: string): string {
        return `Use ${displayPrefix}${this.commandNames[0]} to view the time until the next encounter reset, alongside the number of encounters you have left.`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        let player: Player;
        try {
            player = await beastiary.players.fetch(getGuildMember(parsedMessage.sender, parsedMessage.guild));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player from the cache in the encounter reset command: ${error}`);
        }
        
        let messageString = `You have **${player.encountersLeft}** encounter${player.encountersLeft === 1 ? "" : "s"} left`;

        messageString += ` (**${player.freeEncountersLeft}** free, **${player.extraEncountersLeft}** extra)\n\n`
        messageString += `Next encounter reset: **${remainingTimeString(encounterHandler.nextEncounterReset)}**.`;

        betterSend(parsedMessage.channel, messageString);
    }
}