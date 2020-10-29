import { CommandSection, GuildCommand } from "../structures/Command";
import { GuildCommandParser } from "../structures/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { encounterHandler } from "../beastiary/EncounterHandler";
import { beastiary } from "../beastiary/Beastiary";
import getGuildMember from "../discordUtility/getGuildMember";
import { Player } from "../models/Player";
import { remainingTimeString } from "../utility/timeStuff";

export default class EncounterCommand extends GuildCommand {
    public readonly commandNames = ["encounter", "e"];

    public readonly info = "Initiate an animal encounter";

    public readonly section = CommandSection.gettingStarted;

    public readonly blocksInput = true;

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}${this.commandNames[0]}\` to initiate an animal encounter.`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        // Get the player that initiated the encounter
        let player: Player;
        try {
            player = await beastiary.players.fetch(getGuildMember(parsedMessage.sender, parsedMessage.channel));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player for use in the encounter command: ${error}`);
        }

        // If the player can't encounter an animal
        if (player.freeEncountersLeft === 0) {
            betterSend(parsedMessage.channel, `You don't have any encounters left.\n\nNext encounter reset: **${remainingTimeString(encounterHandler.nextEncounterReset)}**.`);
            return;
        }

        // Indicate that the player has encountered the animal
        player.encounterAnimal();

        // Create a new animal encounter
        try {
            await encounterHandler.spawnAnimal(parsedMessage.channel);
        }
        catch (error) {
            throw new Error(`There was an error creating a new animal encounter: ${error}`);
        }
    }
}