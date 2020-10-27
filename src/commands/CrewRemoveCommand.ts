import { beastiary } from "../beastiary/Beastiary";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Animal } from "../models/Animal";
import { Player } from "../models/Player";
import Command, { CommandSection } from "../structures/Command";
import CommandParser from "../structures/CommandParser";
import { errorHandler } from "../structures/ErrorHandler";

export default class CrewRemoveCommand implements Command {
    public readonly commandNames = ["crewremove", "cr"];

    public readonly info = "Remove an animal from your crew";

    public readonly section = CommandSection.animalManagement;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` \`<animal name or number>\` to remove an animal from your crew.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        if (parsedUserCommand.channel.type === "dm") {
            betterSend(parsedUserCommand.channel, "You can only edit your animal crew in servers.");
            return;
        }

        if (parsedUserCommand.arguments.length < 1) {
            betterSend(parsedUserCommand.channel, this.help(parsedUserCommand.displayPrefix));
            return;
        }

        const searchTerm = parsedUserCommand.arguments[0].text;

        let player: Player;
        try {
            player = await beastiary.players.fetch(getGuildMember(parsedUserCommand.originalMessage.author, parsedUserCommand.channel));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player in the crew remove command: ${error}`);
        }

        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.searchAnimal(searchTerm, {
                guildId: parsedUserCommand.channel.guild.id,
                userId: parsedUserCommand.originalMessage.author.id,
                playerObject: player,
                positionalList: "crew"
            });
        }
        catch (error) {
            throw new Error(`There was an error searching for an animal in a player's crew: ${error}`);
        }

        if (!animal) {
            betterSend(parsedUserCommand.channel, "No animal with that nickname or number exists in your crew.");
            return;
        }

        const targetAnimalId = animal.id;

        const animalInCrew = player.crewAnimalIds.some(animalId => {
            return animalId.equals(targetAnimalId);
        });

        if (!animalInCrew) {
            betterSend(parsedUserCommand.channel, `"${animal.name}" isn't in your crew, so it couldn't be removed.`);
            return;
        }

        try {
            await player.removeAnimalFromCrew(targetAnimalId);
        }
        catch (error) {
            throw new Error(`There was an error removing an animal from a player's crew: ${error}`);
        }

        // Indicate that the command was performed successfully
        parsedUserCommand.originalMessage.react("✅").catch(error => {
            errorHandler.handleError(error, "There was an error attempting to react to a message in the add to crew command.");
        });
    }
}