import { stripIndents } from "common-tags";
import { beastiary } from "../beastiary/Beastiary";
import { ShopReceipt } from "../beastiary/shop/Shop";
import itemShop from "../beastiary/shop/shops/ItemShop";
import handleUserError from "../discordUtility/handleUserError";
import { betterSend } from "../discordUtility/messageMan";
import { GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Player } from "../structures/GameObject/GameObjects/Player";

class ShopBuySubCommand extends GuildCommand {
    public readonly commandNames = ["buy", "b"];

    public readonly info = "Buy and item from a shop";

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` \`<item name/number>\` \`<quantity>\` to buy an item from the shop.`;
    }

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        if (parsedMessage.arguments.length === 0) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return commandReceipt;
        }

        const shopIndex = Number(parsedMessage.arguments[0].text) - 1;

        if (isNaN(shopIndex)) {
            betterSend(parsedMessage.channel, "The item number you want to buy needs to be a number.");
            return commandReceipt;
        }

        let itemQuantity = 1;
        if (parsedMessage.arguments.length > 1) {
            itemQuantity = Number(parsedMessage.arguments[1].text);

            if (isNaN(itemQuantity)) {
                betterSend(parsedMessage.channel, "The quantity of items you want to purchase must be a number.");
                return commandReceipt;
            }
        }

        let player: Player;
        try {
            player = await beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error fetching a player in the shop buy command.

                ${error}
            `);
        }

        let purchaseReceipt: ShopReceipt;
        try {
            purchaseReceipt = itemShop.attemptToPurchase(shopIndex, player, itemQuantity);
        }
        catch (error) {
            handleUserError(parsedMessage.channel, error);
            return commandReceipt;
        }

        betterSend(parsedMessage.channel, `Purchase successful. You bought **${purchaseReceipt.nameAndQuantity}** for **${purchaseReceipt.totalPrice}** scraps.`);
        return commandReceipt;
    }
}
export default new ShopBuySubCommand();