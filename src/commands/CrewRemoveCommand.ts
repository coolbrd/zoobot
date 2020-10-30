import { beastiary } from "../beastiary/Beastiary";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Animal } from "../models/Animal";
import { Player } from "../models/Player";
import { CommandSection, GuildCommand } from "../structures/Command";
import { GuildCommandParser } from "../structures/CommandParser";

export default class CrewRemoveCommand extends GuildCommand {
    public readonly commandNames = ["crewremove", "crr"];

    public readonly info = "Remove an animal from your crew";

    public readonly section = CommandSection.animalManagement;

    public readonly blocksInput = true;

    public readonly reactConfirm = true;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` \`<animal name or number>\` to remove an animal from your crew.`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<boolean> {
        if (!parsedMessage.fullArguments) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return false;
        }

        const searchTerm = parsedMessage.fullArguments.toLowerCase();

        let player: Player;
        try {
            player = await beastiary.players.fetch(getGuildMember(parsedMessage.sender, parsedMessage.channel));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player in the crew remove command: ${error}`);
        }

        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.searchAnimal(searchTerm, {
                guildId: parsedMessage.guild.id,
                userId: parsedMessage.sender.id,
                playerObject: player,
                positionalList: "crew"
            });
        }
        catch (error) {
            throw new Error(`There was an error searching for an animal in a player's crew: ${error}`);
        }

        if (!animal) {
            betterSend(parsedMessage.channel, "No animal with that nickname or number exists in your crew.");
            return false;
        }

        const targetAnimalId = animal.id;

        const animalInCrew = player.crewAnimalIds.some(animalId => {
            return animalId.equals(targetAnimalId);
        });

        if (!animalInCrew) {
            betterSend(parsedMessage.channel, `"${animal.displayName}" isn't in your crew, so it couldn't be removed.`);
            return false;
        }

        player.removeAnimalIdFromCrew(animal.id);

        return true;
    }
}