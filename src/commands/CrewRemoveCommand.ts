import { beastiary } from "../beastiary/Beastiary";
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { stripIndents } from "common-tags";

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

        const guildMember = getGuildMember(parsedMessage.sender, parsedMessage.channel);

        let player: Player;
        try {
            player = await beastiary.players.fetch(guildMember);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error fetching a player in the crew remove command.

                Guild member: ${JSON.stringify(guildMember)}
                
                ${error}
            `);
        }

        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.searchAnimal(searchTerm, {
                guildId: parsedMessage.guild.id,
                userId: parsedMessage.sender.id,
                playerObject: player,
                searchList: "crew"
            });
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error searching for an animal in a player's crew.

                Player: ${JSON.stringify(player)}
                Parsed message: ${JSON.stringify(parsedMessage)}
                
                ${error}
            `);
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