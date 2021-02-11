import BeastiaryClient from "../../bot/BeastiaryClient";
import { betterSend } from "../../discordUtility/messageMan";
import { GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";

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

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        const searchTerm = parsedMessage.restOfText;

        const animal = await beastiaryClient.beastiary.animals.searchPlayerAnimal(searchTerm, player);

        if (!animal) {
            betterSend(parsedMessage.channel, "No animal with that nickname or number exists in your crew.");
            return commandReceipt;
        }

        const targetAnimalId = animal.id;

        const animalInCrew = player.crewAnimalIds.list.some(animalId => {
            return animalId.equals(targetAnimalId);
        });

        if (!animalInCrew) {
            betterSend(parsedMessage.channel, `"${animal.displayName}" isn't in your crew.`);
            return commandReceipt;
        }

        player.crewAnimalIds.remove(animal.id);

        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new CrewRemoveSubCommand();