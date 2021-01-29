import { ShopReceipt } from "../../beastiary/shop/Shop";
import BeastiaryClient from "../../bot/BeastiaryClient";
import handleUserError from "../../discordUtility/handleUserError";
import { betterSend } from "../../discordUtility/messageMan";
import { CommandArgumentInfo, GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";

class ShopBuySubCommand extends GuildCommand {
    public readonly names = ["buy", "b"];

    public readonly info = "Buy and item from a shop";

    public readonly helpUseString = "`<item name/number>` `<quantity>` to buy an item from the shop.";

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "item identifier",
            info: "the name or number of the item you want to buy"
        },{
            name: "quantity",
            optional: true,
            default: "1"
        }
    ];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        if (!parsedMessage.currentArgument) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const itemIdentifier = parsedMessage.consumeArgument().text.toLowerCase();

        let itemQuantity = 1;
        if (parsedMessage.currentArgument) {
            itemQuantity = Number(parsedMessage.consumeArgument().text);

            if (isNaN(itemQuantity)) {
                betterSend(parsedMessage.channel, "The quantity of items you want to purchase must be a number.");
                return commandReceipt;
            }
        }

        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        let purchaseReceipt: ShopReceipt;
        try {
            purchaseReceipt = beastiaryClient.beastiary.shops.itemShop.attemptToPurchase(itemIdentifier, player, itemQuantity);
        }
        catch (error) {
            handleUserError(parsedMessage.channel, error);
            return commandReceipt;
        }

        betterSend(parsedMessage.channel, purchaseReceipt.message);
        return commandReceipt;
    }
}
export default new ShopBuySubCommand();