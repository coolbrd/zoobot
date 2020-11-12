import { MessageEmbed } from "discord.js";
import itemShop from "../beastiary/shop/shops/ItemShop";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { commandHandler } from "../structures/Command/CommandHandler";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildItemShopEmbed(embed: MessageEmbed, player: Player): MessageEmbed {
    embed.setAuthor(`Balance: ${player.scraps} scraps`, player.member.user.avatarURL() || undefined);

    embed.setTitle("Item Shop");
    embed.setColor(0xaf7028);

    let itemString = "";
    let itemNumber = 1;
    for (const item of itemShop.items) {
        itemString += `\`${itemNumber})\` ${capitalizeFirstLetter(item.getName(player))}: ${item.getPrice(player)} scraps\n`;
        itemNumber += 1;
    }

    embed.setDescription(itemString);

    const guildPrefix = commandHandler.getPrefixByGuild(player.member.guild);
    embed.setFooter(`Buy items with "${guildPrefix}shop buy"`);

    return embed;
}