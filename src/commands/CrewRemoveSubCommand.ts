import { stripIndents } from "common-tags";
import { beastiary } from "../beastiary/Beastiary";
import { betterSend } from "../discordUtility/messageMan";
import { GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { Player } from "../structures/GameObject/GameObjects/Player";

class CrewRemoveSubCommand extends GuildCommand {
    public readonly commandNames = ["remove", "r"];

    public readonly info = "Remove an animal from your crew";

    public readonly blocksInput = true;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` \`<animal name or number>\` to remove an animal from your crew.`;
    }

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        if (!parsedMessage.fullArguments) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return commandReceipt;
        }

        const searchTerm = parsedMessage.fullArguments.toLowerCase();

        let player: Player;
        try {
            player = await beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error fetching a player in the crew remove command.

                Guild member: ${JSON.stringify(parsedMessage.member)}
                
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
            return commandReceipt;
        }

        const targetAnimalId = animal.id;

        const animalInCrew = player.crewAnimalIds.some(animalId => {
            return animalId.equals(targetAnimalId);
        });

        if (!animalInCrew) {
            betterSend(parsedMessage.channel, `"${animal.displayName}" isn't in your crew, so it couldn't be removed.`);
            return commandReceipt;
        }

        player.removeAnimalIdFromCrew(animal.id);

        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new CrewRemoveSubCommand();