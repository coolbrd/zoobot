import { stripIndent } from "common-tags";
import BeastiaryClient from "../../bot/BeastiaryClient";
import { betterSend } from "../../discordUtility/messageMan";
import { CommandArgumentInfo, GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";
import { Species } from "../../structures/GameObject/GameObjects/Species";
import { capitalizeFirstLetter } from "../../utility/arraysAndSuch";

class WishlistRemoveCommand extends GuildCommand {
    public readonly names = ["remove"];

    public readonly info = "Remove a species from your wishlist";

    public readonly helpUseString = "`<species name>` to remove a species from your wishlist.";

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "species name",
            info: "the name of the species to remove from your wishlist",
            optional: false
        }
    ];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return receipt;
        }

        const searchTerm = parsedMessage.restOfText.toLowerCase();

        let potentialSpecies: Species | undefined;
        try {
            potentialSpecies = await beastiaryClient.beastiary.species.searchSingleSpeciesByCommonNameAndHandleDisambiguation(searchTerm, parsedMessage.channel);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error searching for a species in the wishlist remove command.

                ${error}
            `);
        }

        if (!potentialSpecies) {
            return receipt;
        }

        const species = potentialSpecies;

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        const speciesIdInList = player.wishedSpeciesIds.list.find(id => id.equals(species.id));
        if (!speciesIdInList) {
            betterSend(parsedMessage.channel, `${capitalizeFirstLetter(species.commonNames[0])} is not in your wishlist, so it could not be removed.`);
            return receipt;
        }

        player.wishedSpeciesIds.remove(species.id);

        receipt.reactConfirm = true;
        return receipt;
    }
}
export default new WishlistRemoveCommand();