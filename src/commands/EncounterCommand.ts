import Command from "../structures/CommandInterface";
import CommandParser from "../structures/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { DMChannel } from "discord.js";
import { errorHandler } from "../structures/ErrorHandler";
import { encounterHandler } from "../beastiary/EncounterHandler";

export default class EncounterCommand implements Command {
    public readonly commandNames = ["encounter", "e"];

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}e\` to initiate an animal encounter.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        if (parsedUserCommand.channel instanceof DMChannel) {
            betterSend(parsedUserCommand.channel, "Animal encounters can only be initiated in servers.");
            return;
        }

        try {
            await encounterHandler.spawnAnimal(parsedUserCommand.channel);
        }
        catch (error) {
            errorHandler.handleError(error, "There was an rror creating a new animal encounter.");
        }
    }
}