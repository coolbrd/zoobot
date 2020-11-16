import { stripIndent } from "common-tags";
import { beastiary } from "../../beastiary/Beastiary";
import { ShopReceipt } from "../../beastiary/shop/Shop";
import itemShop from "../../beastiary/shop/shops/ItemShop";
import handleUserError from "../../discordUtility/handleUserError";
import { betterSend } from "../../discordUtility/messageMan";
import { CommandArgumentInfo, GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";
import { Player } from "../../structures/GameObject/GameObjects/Player";

class ShopBuySubCommand extends GuildCommand {
    public readonly commandNames = ["buy", "b"];

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

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        if (parsedMessage.arguments.length === 0) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const itemIdentifier = parsedMessage.arguments[0].text.toLowerCase();

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
            throw new Error(stripIndent`
                There was an error fetching a player in the shop buy command.

                ${error}
            `);
        }

        let purchaseReceipt: ShopReceipt;
        try {
            purchaseReceipt = itemShop.attemptToPurchase(itemIdentifier, player, itemQuantity);
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