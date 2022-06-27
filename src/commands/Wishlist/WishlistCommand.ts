import { stripIndent } from "common-tags";
import BeastiaryClient from "../../bot/BeastiaryClient";
import { betterSend } from "../../discordUtility/messageMan";
import SmartEmbed from "../../discordUtility/SmartEmbed";
import { CommandSection, GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";
import { Species } from "../../structures/GameObject/GameObjects/Species";
import { capitalizeFirstLetter } from "../../utility/arraysAndSuch";
import WishlistAddCommand from "./WishlistAddCommand";
import WishlistRemoveCommand from "./WishlistRemoveCommand";

class WishlistCommand extends GuildCommand {
    public readonly names = ["wishlist", "wish", "wishes"];

    public readonly info = "View/modify your species wishlist";

    public readonly helpUseString = "to view your species wishlist.";

    public readonly sections = [CommandSection.gameplay];

    public readonly subCommands = [WishlistAddCommand, WishlistRemoveCommand];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        let wishedSpecies: Species[];
        try {
            wishedSpecies = await player.getWishedSpecies();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting a player's wished species in the wishlist command.

                ${error}
            `);
        }

        const embed = new SmartEmbed();
        embed.setColor(0xfffb38);
        embed.setAuthor({ name: `${player.username}'s wishlist`, iconURL: player.avatarURL });

        let descriptionString: string;
        if (wishedSpecies.length > 0) {
            embed.setThumbnail(wishedSpecies[0].cards[0].url);
            descriptionString = "";
            for (let i = 0; i < wishedSpecies.length; i++) {
                descriptionString += `\`${i + 1})\` ${capitalizeFirstLetter(wishedSpecies[i].commonNames[0])}\n`;
            }
        }
        else {
            descriptionString = "You don't have any wished species. Add some with the `wishlist` `add` command!";
        }
        embed.setDescription(descriptionString);
        embed.setFooter({ text: stripIndent`
            ${wishedSpecies.length} wished species (max ${player.maxWishlistSize})
            Wished species appear more often for you in encounters.
        `});

        betterSend(parsedMessage.channel, embed);

        return receipt;
    }
}
export default new WishlistCommand();