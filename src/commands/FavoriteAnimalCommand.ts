import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";

class FavoriteAnimalCommand extends GuildCommand {
    public readonly names = ["favorite", "favoriteanimal", "f", "favourite", "favouriteanimal"];

    public readonly info = "Select your favorite animal to put at the top of your collection";

    public readonly helpUseString = "`<animal name or number>` to select your favorite animal, which will be displayed at the top of your collection and on your profile."

    public readonly section = CommandSection.animalManagement;

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        if (!parsedMessage.restOfText) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        const searchTerm = parsedMessage.restOfText.toLowerCase();

        const animal = beastiaryClient.beastiary.animals.searchPlayerAnimal(searchTerm, player);

        if (!animal) {
            betterSend(parsedMessage.channel, `No animal with the nickname/number \`${searchTerm}\` exists in your collection.`);
            return commandReceipt;
        }

        player.collectionAnimalIds.remove(animal.id);
        player.collectionAnimalIds.insert(0, animal.id);

        player.favoriteAnimalId = animal.id;

        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new FavoriteAnimalCommand();