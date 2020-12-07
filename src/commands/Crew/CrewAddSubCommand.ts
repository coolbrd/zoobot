import { stripIndent } from "common-tags";
import BeastiaryClient from "../../bot/BeastiaryClient";
import { betterSend } from "../../discordUtility/messageMan";
import { GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";
import { Animal } from "../../structures/GameObject/GameObjects/Animal";

class CrewAddSubCommand extends GuildCommand {
    public readonly commandNames = ["add", "a"];

    public readonly info = "Add an animal to your crew";

    public readonly helpUseString = "`<animal nickname or number>` to add an animal to your crew, allowing them to passively earn xp.";

    public readonly blocksInput = true;

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        if (!parsedMessage.restOfText) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const animalIdentifier = parsedMessage.restOfText.toLowerCase();

        let animal: Animal | undefined;
        try {
            animal = await beastiaryClient.beastiary.animals.searchAnimal(animalIdentifier, {
                guildId: parsedMessage.guild.id,
                userId: parsedMessage.sender.id,
                searchList: "collection"
            });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error searching for an animal when attempting to add an animal to a player's crew.

                Search term: ${animalIdentifier}
                Parsed message: ${JSON.stringify(parsedMessage)}
                
                ${error}
            `);
        }

        if (!animal) {
            betterSend(parsedMessage.channel, "No animal with that nickname/number exists in your collection.");
            return commandReceipt;
        }

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        if (player.crewAnimalIds.includes(animal.id)) {
            betterSend(parsedMessage.channel, "That animal is already in your crew.");
            return commandReceipt;
        }

        if (player.crewFull) {
            betterSend(parsedMessage.channel, "Your crew is full, remove an animal and try again.");
            return commandReceipt;
        }

        player.addAnimalIdToCrew(animal.id);

        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new CrewAddSubCommand();