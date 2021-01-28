import { ShopReceipt } from "../beastiary/shop/Shop";
import CollectionExpander from "../beastiary/shop/shopItems/CollectionExpander";
import FreeEncounterMaxStackUpgrade from "../beastiary/shop/shopItems/FreeEncounterMaxStackUpgrade";
import FreeXpBoostMaxStackUpgrade from "../beastiary/shop/shopItems/FreeXpBoostMaxStackUpgrade";
import UpgradeShop from "../beastiary/shop/shops/UpgradeShop";
import BeastiaryClient from "../bot/BeastiaryClient";
import handleUserError from "../discordUtility/handleUserError";
import { betterSend } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { CommandArgumentInfo, CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class UpgradeCommand extends GuildCommand {
    public readonly names = ["upgrade", "u"];

    public readonly info = "View and buy permanent upgrades";

    public readonly helpUseString = "to view your available upgrades, their levels, and prices.";

    public readonly sections = [CommandSection.gameplay];

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "upgrade name",
            info: "the upgrade you want to buy",
            optional: true
        }
    ];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        if (!parsedMessage.currentArgument) {
            const pepEmoji = beastiaryClient.beastiary.emojis.getByName("pep");
            const embed = new SmartEmbed();
            embed.setColor(0x5DB583);
            embed.setAuthor(`${player.member.user.username}'s upgrades`, player.member.user.avatarURL() || undefined);
            embed.setDescription(`Balance: **${player.pep}**${pepEmoji}\n---`);
            embed.addField(`\`1)\` Collection level: ${player.collectionUpgradeLevel} (max ${player.collectionSizeLimit})`, `Next level: **${CollectionExpander.getPrice(player)}**${pepEmoji} (+**5** max)`);
            embed.addField(`\`2)\` Free encounter max stack: ${player.freeEnconterMaxStack}`, `Next level: **${FreeEncounterMaxStackUpgrade.getPrice(player)}**${pepEmoji} (+**1** max)`, true);
            embed.addField(`\`3)\` Free xp boost max stack: ${player.freeXpBoostMaxStack}`, `Next level: **${FreeXpBoostMaxStackUpgrade.getPrice(player)}**${pepEmoji} (+**1** max)`, true);
            embed.setFooter(`Use '${this.primaryName} <name/number of upgrade>' to purchase a permanent upgrade.`);

            betterSend(parsedMessage.channel, embed);
        }
        else {
            const upgradeIdentifier = parsedMessage.consumeArgument().text;

            let purchaseReceipt: ShopReceipt;
            try {
                purchaseReceipt = UpgradeShop.attemptToPurchase(beastiaryClient.beastiary.emojis, upgradeIdentifier, player);
            }
            catch (error) {
                handleUserError(parsedMessage.channel, error);
                return receipt;
            }

            betterSend(parsedMessage.channel, purchaseReceipt.message);
        }

        return receipt;
    }
}
export default new UpgradeCommand();