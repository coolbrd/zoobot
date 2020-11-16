import { beastiary } from "../beastiary/Beastiary";
import { betterSend } from "../discordUtility/messageMan";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";

class FavoriteAnimalCommand extends GuildCommand {
    public readonly commandNames = ["favorite", "favoriteanimal", "f", "favourite", "favouriteanimal"];

    public readonly info = "Select your favorite animal to put at the top of your collection";

    public readonly helpUseString = "`<animal name or number>` to select your favorite animal, which will be displayed at the top of your collection and on your profile."

    public readonly section = CommandSection.animalManagement;

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        if (!parsedMessage.fullArguments) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const searchTerm = parsedMessage.fullArguments.toLowerCase();

        let player: Player;
        try {
            player = await beastiary.players.fetch(parsedMessage.member)
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting a player in the favorite animal command.
                
                Guild member: ${JSON.stringify(parsedMessage.member)}

                ${error}
            `);
        }

        let animal: Animal | undefined;
        try {
            animal = await beastiary.animals.searchAnimal(searchTerm, {
                playerObject: player,
                searchList: "collection"
            });
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error searching an animal in the favorite command.

                Search term: ${searchTerm}
                Player: ${player.debugString}
                
                ${error}
            `);
        }

        if (!animal) {
            betterSend(parsedMessage.channel, `No animal with the nickname/number \`${searchTerm}\` exists in your collection.`);
            return commandReceipt;
        }

        player.removeAnimalIdFromCollection(animal.id);
        player.addAnimalIdsToCollectionPositional([animal.id], 0);

        commandReceipt.reactConfirm = true;
        return commandReceipt;
    }
}
export default new FavoriteAnimalCommand();