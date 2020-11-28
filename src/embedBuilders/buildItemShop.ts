import { MessageEmbed } from "discord.js";
import itemShop from "../beastiary/shop/shops/ItemShop";
import BeastiaryClient from "../bot/BeastiaryClient";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildItemShopEmbed(embed: MessageEmbed, player: Player, beastiaryClient: BeastiaryClient): MessageEmbed {
    
    embed.setAuthor(`Balance: ${player.pep} pep`, player.member.user.avatarURL() || undefined);

    embed.setTitle("Item Shop");
    embed.setColor(0xaf7028);

    const pepEmoji = beastiaryClient.beastiary.emojis.getByName("pep");

    let itemString = "";
    let itemNumber = 1;
    for (const item of itemShop.items) {
        itemString += `\`${itemNumber})\` ${capitalizeFirstLetter(item.getName(player))}: ${item.getPrice(player)}${pepEmoji}\n`;
        itemNumber += 1;
    }

    embed.setDescription(itemString);

    const guildPrefix = beastiaryClient.commandHandler.getPrefixByGuild(player.member.guild);
    embed.setFooter(`Buy items with "${guildPrefix}shop buy"`);

    return embed;
}