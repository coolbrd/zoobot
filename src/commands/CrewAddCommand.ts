import { beastiary } from "../beastiary/Beastiary";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Animal } from "../models/Animal";
import { Player } from "../models/Player";
import Command, { CommandSection } from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { errorHandler } from "../structures/ErrorHandler";

export default class CrewAddCommand implements Command {
    public readonly commandNames = ["crewadd", "ca"];

    public readonly info = "Add an animal to your crew";

    public readonly section = CommandSection.animalManagement;

    public readonly blocksInput = true;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` \`<animal nickname or number>\` to add an animal to your crew, allowing them to passively earn xp.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        if (parsedUserCommand.channel.type === "dm") {
            betterSend(parsedUserCommand.channel, "This command can only be used in servers.");
            return;
        }

        if (!parsedUserCommand.fullArguments) {
            betterSend(parsedUserCommand.channel, this.help(parsedUserCommand.displayPrefix));
            return;
        }

        const animalIdentifier = parsedUserCommand.fullArguments.toLowerCase();

        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.searchAnimal(animalIdentifier, {
                guildId: parsedUserCommand.channel.guild.id,
                userId: parsedUserCommand.originalMessage.author.id,
                positionalList: "collection"
            });
        }
        catch (error) {
            throw new Error(`There was an error searching for an animal when attempting to add an animal to a player's crew: ${error}`);
        }

        if (!animal) {
            betterSend(parsedUserCommand.channel, "No animal with that nickname/number exists in your collection.");
            return;
        }

        let player: Player;
        try {
            player = await beastiary.players.fetch(getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player in the animal add to crew command: ${error}`);
        }

        if (player.crewAnimalIds.includes(animal.id)) {
            betterSend(parsedUserCommand.channel, "That animal is already in your crew.");
            return;
        }

        if (player.crewAnimalIds.length >= 4) {
            betterSend(parsedUserCommand.channel, "Your crew is full, remove an animal and try again.");
            return;
        }

        try {
            await player.addAnimalToCrew(animal.id);
        }
        catch (error) {
            throw new Error(`There was an error adding an animal to a player's crew: ${error}`);
        }

        // Indicate that the command was performed successfully
        parsedUserCommand.originalMessage.react("✅").catch(error => {
            errorHandler.handleError(error, "There was an error attempting to react to a message in the add to crew command.");
        });
    }
}