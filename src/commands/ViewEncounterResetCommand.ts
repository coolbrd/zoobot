import { beastiary } from "../beastiary/Beastiary";
import { encounterHandler } from "../beastiary/EncounterHandler";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Player } from "../models/Player";
import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { remainingTimeString } from "../utility/timeStuff";

// Displays a player's current number of encounters stored, plus the amount of time until the next free encounter reset
export default class ViewEncounterResetCommand implements Command {
    public readonly commandNames = ["encounterreset", "er", "encounterperiod", "ep"];

    public readonly info = "View your current number of encounters remaining, and the time until the next encounter reset.";

    public help(displayPrefix: string): string {
        return `Use ${displayPrefix}${this.commandNames[0]} to view the time until the next encounter reset, alongside the number of free encounters you have left.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        if (parsedUserCommand.channel.type === "dm") {
            betterSend(parsedUserCommand.channel, "This command can only be used in servers.");
            return;
        }

        // Get the player that initiated this command
        let player: Player;
        try {
            player = await beastiary.players.fetch(getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel.guild));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player from the cache in the encounter reset command: ${error}`);
        }
        
        // Determine the number of encounters that this player has left
        let encountersLeft: number;
        try {
            encountersLeft = await player.encountersLeft();
        }
        catch (error) {
            throw new Error(`There was an error getting the number of encounters a player has left: ${error}`);
        }
        
        // Format and send an informational message
        let messageString = `You have **${encountersLeft}** encounter${encountersLeft === 1 ? "" : "s"} left.\n\n`;

        messageString += `Next encounter reset: **${remainingTimeString(encounterHandler.nextEncounterReset)}**.`;

        betterSend(parsedUserCommand.channel, messageString);
    }
}