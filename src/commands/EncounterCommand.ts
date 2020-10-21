import Command, { CommandSection } from "../structures/Command";
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

    public readonly section = CommandSection.gettingStarted;

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}${this.commandNames[0]}\` to initiate an animal encounter.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // Don't allow encounters in dm channels
        if (parsedUserCommand.channel.type === "dm") {
            betterSend(parsedUserCommand.channel, "Animal encounters can only be initiated in servers.");
            return;
        }

        // Get the player that initiated the encounter
        let player: Player;
        try {
            player = await beastiary.players.fetch(getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player for use in the encounter command: ${error}`);
        }

        // Determine whether or not the player has an encounter right now
        let canEncounter: boolean;
        try {
            canEncounter = await player.canEncounter();
        }
        catch (error) {
            throw new Error(`There was an error checking if a player has any encounters left in the encounter command: ${error}`);
        }

        // If the player can't encounter an animal
        if (!canEncounter) {
            betterSend(parsedUserCommand.channel, `You don't have any encounters left.\n\nNext encounter reset: **${remainingTimeString(encounterHandler.nextEncounterReset)}**.`);
            return;
        }

        // If one of the user's previous encounters hasn't loaded yet
        if (encounterHandler.userIsLoadingEncounter(player.user.id)) {
            betterSend(parsedUserCommand.channel, "You're going to fast, your previous encounter hasn't even loaded yet!");
            return;
        }

        // Add the user to the list of those currently loading encounters, preventing them from spamming encounters
        encounterHandler.userBeginEncounterLoad(player.user.id);

        try {
            // Use one of the player's encounters
            try {
                await player.encounterAnimal();
            }
            catch (error) {
                throw new Error(`There was an error indicating to a player object that an encounter was initiated: ${error}`);
            }

            // Create a new animal encounter
            try {
                await encounterHandler.spawnAnimal(parsedUserCommand.channel);
            }
            catch (error) {
                throw new Error(`There was an error creating a new animal encounter: ${error}`);
            }
        }
        // Regardless of errors encountered in creating the encounter
        finally {
            // Mark the player as no longer loading an encounter
            encounterHandler.userEndEncounterLoad(player.user.id);
        }
    }
}