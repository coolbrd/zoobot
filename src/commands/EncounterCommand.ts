import { DMChannel } from "discord.js";

import Command from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { encounterHandler } from "../beastiary/EncounterHandler";
import { beastiary } from "../beastiary/Beastiary";
import getGuildMember from "../discordUtility/getGuildMember";
import { Player } from "../models/Player";
import { remainingTimeString } from "../utility/timeStuff";

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

        let player: Player;
        try {
            player = await beastiary.players.fetch(getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player for use in the encounter command: ${error}`);
        }

        let canEncounter: boolean;
        try {
            canEncounter = await player.canEncounter();
        }
        catch (error) {
            throw new Error(`There was an error checking if a player has any encounters left in the encounter command: ${error}`);
        }

        if (!canEncounter) {
            betterSend(parsedUserCommand.channel, `You don't have any encounters left.\n\nNext encounter reset: **${remainingTimeString(encounterHandler.nextEncounterReset)}**`);
            return;
        }

        try {
            await encounterHandler.spawnAnimal(parsedUserCommand.channel);
        }
        catch (error) {
            throw new Error(`There was an error creating a new animal encounter: ${error}`);
        }

        try {
            await player.encounterAnimal();
        }
        catch (error) {
            throw new Error(`There was an error indicating to a player object that an encounter was initiated: ${error}`);
        }
    }
}