import { MessageEmbed } from "discord.js";
import ShopBuySubCommand from "../../../commands/Shop/ShopBuySubCommand";
import ShopCommand from "../../../commands/Shop/ShopCommand";
import SmartEmbed from "../../../discordUtility/SmartEmbed";
import { Player } from "../../../structures/GameObject/GameObjects/Player";
import { capitalizeFirstLetter } from "../../../utility/arraysAndSuch";
import Emojis from "../../Emojis";
import Shop from "../Shop";
import CaptureItem from "../shopItems/Capture";
import EncounterItem from "../shopItems/Encounter";
import XpBoostItem from "../shopItems/XpBoost";

export default class ItemShop extends Shop {
    protected readonly itemClasses = [
        EncounterItem,
        CaptureItem,
        XpBoostItem
    ];

    public buildEmbed(player: Player): MessageEmbed {
        const embed = new SmartEmbed();

        embed.setAuthor({ name: `Balance: ${player.pep} pep`, iconURL: player.avatarURL });
        embed.setTitle("Item Shop");
        embed.setColor(0xaf7028);

        let itemString = "";
        for (let i = 0; i < this.items.length; i++) {
            const item = this.items[i];
            itemString += `\`${i + 1})\` ${capitalizeFirstLetter(item.getName(player))}: ${item.getPrice(player)}${Emojis.pep}\n`;
        }

        embed.setDescription(itemString);
        embed.setFooter({  text: `Use '${ShopCommand.primaryName} ${ShopBuySubCommand.primaryName} <item name> <quantity>' to buy items from the shop.` })

        return embed;
    }
}