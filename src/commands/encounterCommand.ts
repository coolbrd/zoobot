import Command from "./commandInterface";
import CommandParser from "../utility/commandParser";
import { spawnAnimal } from "../zoo/encounter";
import { betterSend } from "../utility/toolbox";
import { DMChannel } from "discord.js";

export class EncounterCommand implements Command {
    public readonly commandNames = ['encounter', 'e'];

    public help(commandPrefix: string): string {
        return `Use ${commandPrefix} to initiate an animal encounter.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        if (parsedUserCommand.channel instanceof DMChannel) {
            betterSend(parsedUserCommand.channel, 'Animal encounters can only be initiated in servers.');
            return;
        }

        spawnAnimal(parsedUserCommand.channel);
    }
}