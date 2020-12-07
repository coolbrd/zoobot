import { stripIndent } from "common-tags";
import BeastiaryClient from "../../bot/BeastiaryClient";
import { betterSend } from "../../discordUtility/messageMan";
import { GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";
import { Animal } from "../../structures/GameObject/GameObjects/Animal";

class CrewRemoveSubCommand extends GuildCommand {
    public readonly names = ["remove", "r"];

    public readonly info = "Remove an animal from your crew";

    public readonly helpUseString = "`<animal name or number>` to remove an animal from your crew.";

    public readonly blocksInput = true;

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        if (!parsedMessage.restOfText) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const searchTerm = parsedMessage.restOfText.toLowerCase();

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        let animal: Animal | undefined;
        try {
            animal = await beastiaryClient.beastiary.animals.searchAnimal(searchTerm, {
                guildId: parsedMessage.guild.id,
                userId: parsedMessage.sender.id,
                playerObject: player,
                searchList: "crew"
            });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error searching for an animal in a player's crew.

                Player: ${player.debugString}
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