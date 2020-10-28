import { beastiary } from "../beastiary/Beastiary";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Animal } from "../models/Animal";
import { Player } from "../models/Player";
import { CommandSection, GuildCommand } from "../structures/Command";
import { GuildCommandParser } from "../structures/CommandParser";

// Adds an animal to a player's crew
export default class CrewAddCommand extends GuildCommand {
    public readonly commandNames = ["crewadd", "ca"];

    public readonly info = "Add an animal to your crew";

    public readonly section = CommandSection.animalManagement;

    public readonly blocksInput = true;

    public readonly reactConfirm = true;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` \`<animal nickname or number>\` to add an animal to your crew, allowing them to passively earn xp.`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        if (!parsedMessage.fullArguments) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return;
        }

        const animalIdentifier = parsedMessage.fullArguments.toLowerCase();

        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.searchAnimal(animalIdentifier, {
                guildId: parsedMessage.guild.id,
                userId: parsedMessage.sender.id,
                positionalList: "collection"
            });
        }
        catch (error) {
            throw new Error(`There was an error searching for an animal when attempting to add an animal to a player's crew: ${error}`);
        }

        if (!animal) {
            betterSend(parsedMessage.channel, "No animal with that nickname/number exists in your collection.");
            return;
        }

        let player: Player;
        try {
            player = await beastiary.players.fetch(getGuildMember(parsedMessage.sender, parsedMessage.channel));
        }
        catch (error) {
            throw new Error(`There was an error fetching a player in the animal add to crew command: ${error}`);
        }

        if (player.crewAnimalIds.includes(animal.id)) {
            betterSend(parsedMessage.channel, "That animal is already in your crew.");
            return;
        }

        if (player.crewAnimalIds.length >= 4) {
            betterSend(parsedMessage.channel, "Your crew is full, remove an animal and try again.");
            return;
        }

        try {
            await player.addAnimalToCrew(animal.id);
        }
        catch (error) {
            throw new Error(`There was an error adding an animal to a player's crew: ${error}`);
        }
    }
}