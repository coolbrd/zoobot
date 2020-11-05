import { MessageEmbed } from "discord.js";
import itemShop from "../beastiary/shop/shops/ItemShop";
import { Player } from "../models/Player";
import { commandHandler } from "../structures/CommandHandler";

export default function buildItemShopEmbed(embed: MessageEmbed, player: Player): MessageEmbed {
    embed.setAuthor(`Balance: ${player.scraps} scraps`, player.member.user.avatarURL() || undefined);

    embed.setTitle("Item Shop");
    embed.setColor(0xaf7028);

    let itemString = "";
    let itemNumber = 1;
    for (const item of itemShop.items) {
        itemString += `\`${itemNumber})\` ${item.name}: ${item.price} scraps\n`;
        itemNumber += 1;
    }

    embed.setDescription(itemString);

    const guildPrefix = commandHandler.getPrefixByGuild(player.member.guild);
    embed.setFooter(`Buy items with "${guildPrefix}shop buy"`);

    return embed;
}