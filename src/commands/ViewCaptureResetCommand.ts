import { beastiary } from "../beastiary/Beastiary";
import { encounterHandler } from "../beastiary/EncounterHandler";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Player } from "../models/Player";
import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { remainingTimeString } from "../utility/timeStuff";

// Displays the player's current capture availability, and the time remaining until the next capture reset
export default class ViewCaptureResetCommand implements Command {
    public readonly commandNames = ["capturereset", "captureperiod", "cr", "cp"];

    public readonly info = "See your current number of captures left and the time until the next reset";

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` to view how many captures you have, and the amount of time until the next reset.`;
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
            throw new Error(`There was an error fetching a player from the cache in the capture reset command: ${error}`);
        }

        // Determine whether or not the player can currently capture an animal
        let canCapture: boolean;
        try {
            canCapture = await player.canCapture();
        }
        catch (error) {
            throw new Error(`There was an error checking if a player can capture in the capture reset command: ${error}`);
        }

        // Format and send an informational message
        let messageString: string;
        if (canCapture) {
            messageString = "You can capture right now.";
        }
        else {
            messageString = "You can't capture right now.";
        }
        messageString += "\n\n";

        messageString += `Next capture reset: **${remainingTimeString(encounterHandler.nextCaptureReset)}**.`;

        betterSend(parsedUserCommand.channel, messageString);
    }
}