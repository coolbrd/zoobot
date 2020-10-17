import { beastiary } from "../beastiary/Beastiary";
import { encounterHandler } from "../beastiary/EncounterHandler";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";

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

        const player = await beastiary.players.fetch(getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel.guild));

        let messageString = "";
        const canCapture = await player.canCapture();
        if (canCapture) {
            messageString += "You can capture right now";
        }
        else {
            messageString += "You can't capture right now";
        }
        messageString += "\n\n";

        messageString += `Next capture reset: ${encounterHandler.nextCaptureResetTimeString}.`;

        betterSend(parsedUserCommand.channel, messageString);
    }
}