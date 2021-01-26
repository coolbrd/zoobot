import { stripIndent } from "common-tags";
import BeastiaryClient from "../../bot/BeastiaryClient";
import gameConfig from "../../config/gameConfig";
import { betterSend } from "../../discordUtility/messageMan";
import { CommandArgumentInfo, GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";
import { Species } from "../../structures/GameObject/GameObjects/Species";
import { capitalizeFirstLetter } from "../../utility/arraysAndSuch";

class WishlistAddCommand extends GuildCommand {
    public readonly names = ["add"];

    public readonly info = "Add a species to your wishlist";

    public readonly helpUseString = "`<species name>` to add a species to your wishlist.";

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "species name",
            info: "the name of the species to add to your wishlist",
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
                There was an error searching for a species in the wishlist add command.

                ${error}
            `);
        }

        if (!potentialSpecies) {
            return receipt;
        }

        const species = potentialSpecies;

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        if (player.wishlistFull) {
            let wishlistFullString = "Your wishlist is full. Remove something and try again!";

            if (!player.premium) {
                wishlistFullString += `\n\nWant more space?\nSubscribe at <${gameConfig.patreonLink}> for exclusive premium features such as more wish list space, encounters, and xp!`;
            }

            betterSend(parsedMessage.channel, wishlistFullString);
            return receipt;
        }

        const speciesIdInList = player.wishedSpeciesIds.list.find(id => id.equals(species.id));
        if (speciesIdInList) {
            betterSend(parsedMessage.channel, `${capitalizeFirstLetter(species.commonNames[0])} is already in your wishlist, it can't be added again.`);
            return receipt;
        }

        player.wishedSpeciesIds.push(species.id);

        receipt.reactConfirm = true;
        return receipt;
    }
}
export default new WishlistAddCommand();