import { DMChannel } from "discord.js";

import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { encounterHandler } from "../beastiary/EncounterHandler";
import { beastiary } from "../beastiary/Beastiary";
import getGuildMember from "../discordUtility/getGuildMember";

export default class EncounterCommand implements Command {
    public readonly commandNames = ["encounter", "e"];

    public readonly info = "Initiate an animal encounter";

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}${this.commandNames[0]}\` to initiate an animal encounter.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        if (parsedUserCommand.channel instanceof DMChannel) {
            betterSend(parsedUserCommand.channel, "Animal encounters can only be initiated in servers.");
            return;
        }

        const player = await beastiary.players.fetch(getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel.guild));

        if (player.encountersLeft <= 0) {
            betterSend(parsedUserCommand.channel, "You don't have any encounters left.");
            return;
        }

        try {
            await encounterHandler.spawnAnimal(parsedUserCommand.channel);
        }
        catch (error) {
            throw new Error(`There was an error creating a new animal encounter: ${error}`);
        }

        try {
            await player.useEncounter();
        }
        catch (error) {
            throw new Error(`There was an error using a player's encounter in the encounter command: ${error}`);
        }
    }
}