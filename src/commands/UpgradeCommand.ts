import { ShopReceipt } from "../beastiary/shop/Shop";
import BeastiaryClient from "../bot/BeastiaryClient";
import handleUserError from "../discordUtility/handleUserError";
import { betterSend } from "../discordUtility/messageMan";
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

        const upgradeShop = beastiaryClient.beastiary.shops.upgradeShop;

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        if (!parsedMessage.currentArgument) {
            const upgradeShopEmbed = upgradeShop.buildEmbed(player);

            betterSend(parsedMessage.channel, upgradeShopEmbed);
        }
        else {
            const upgradeIdentifier = parsedMessage.restOfText.toLowerCase();

            let purchaseReceipt: ShopReceipt;
            try {
                purchaseReceipt = upgradeShop.attemptToPurchase(upgradeIdentifier, player);
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