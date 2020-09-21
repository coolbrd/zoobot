import Command from "./commandInterface";
import CommandParser from "../structures/commandParser";
import { betterSend } from "../discordUtility/messageMan";
import { DMChannel } from "discord.js";
import { encounterHandler } from "..";

export class EncounterCommand implements Command {
    public readonly commandNames = ['encounter', 'e'];

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}e\` to initiate an animal encounter.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        if (parsedUserCommand.channel instanceof DMChannel) {
            betterSend(parsedUserCommand.channel, 'Animal encounters can only be initiated in servers.');
            return;
        }

        encounterHandler.spawnAnimal(parsedUserCommand.channel);
    }
}