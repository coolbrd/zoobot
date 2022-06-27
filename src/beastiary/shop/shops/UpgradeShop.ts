import { stripIndent } from "common-tags";
import { MessageEmbed } from "discord.js";
import UpgradeCommand from "../../../commands/UpgradeCommand";
import SmartEmbed from "../../../discordUtility/SmartEmbed";
import { Player } from "../../../structures/GameObject/GameObjects/Player";
import { capitalizeFirstLetter } from "../../../utility/arraysAndSuch";
import Emojis from "../../Emojis";
import Shop from "../Shop";
import CollectionExpander from "../shopItems/CollectionExpander";
import FreeEncounterMaxStackUpgrade from "../shopItems/FreeEncounterMaxStackUpgrade";
import FreeXpBoostMaxStackUpgrade from "../shopItems/FreeXpBoostMaxStackUpgrade";
import WishlistSlotsUgprade from "../shopItems/WishlistSlotsUgprade";

export default class UpgradeShop extends Shop {
    public readonly itemClasses = [
        CollectionExpander,
        FreeEncounterMaxStackUpgrade,
        FreeXpBoostMaxStackUpgrade,
        WishlistSlotsUgprade
    ];

    public buildEmbed(player: Player): MessageEmbed {
        const embed = new SmartEmbed();
        
        embed.setColor(0x5DB583);
        embed.setAuthor({ name: `${player.username}'s upgrades`, iconURL: player.avatarURL });
        embed.setDescription(`Balance: **${player.pep}**${Emojis.pep}\n---`);
        
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            embed.addField(
                `\`${i + 1})\` ${capitalizeFirstLetter(item.getName(player))}`,
                stripIndent`
                    Next level: **${item.getPrice(player)}**${Emojis.pep}
                    (+**${item.effectiveChangeAmount}** max)
                `,
                item.inline
            );
        }

        embed.setFooter({  text: `Use '${UpgradeCommand.primaryName} <name/number of upgrade>' to purchase a permanent upgrade.` })

        return embed;
    }
}