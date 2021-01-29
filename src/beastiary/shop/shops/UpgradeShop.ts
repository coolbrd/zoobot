import { stripIndent } from "common-tags";
import { MessageEmbed } from "discord.js";
import UpgradeCommand from "../../../commands/UpgradeCommand";
import SmartEmbed from "../../../discordUtility/SmartEmbed";
import { Player } from "../../../structures/GameObject/GameObjects/Player";
import { capitalizeFirstLetter } from "../../../utility/arraysAndSuch";
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

        const pepEmoji = this.beastiaryClient.beastiary.emojis.getByName("pep");
        
        embed.setColor(0x5DB583);
        embed.setAuthor(`${player.member.user.username}'s upgrades`, player.member.user.avatarURL() || undefined);
        embed.setDescription(`Balance: **${player.pep}**${pepEmoji}\n---`);
        
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            embed.addField(
                `\`${i + 1})\` ${capitalizeFirstLetter(item.getName(player))}`,
                stripIndent`
                    Next level: **${item.getPrice(player)}**${pepEmoji}
                    (+**${item.effectiveUpgradeAmount}** max)
                `,
                true
            );
        }

        embed.setFooter(`Use '${UpgradeCommand.primaryName} <name/number of upgrade>' to purchase a permanent upgrade.`);

        return embed;
    }
}