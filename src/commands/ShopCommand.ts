import { stripIndents } from "common-tags";
import { APIMessage, TextChannel } from "discord.js";
import { beastiary } from "../beastiary/Beastiary";
import { ShopReceipt } from "../beastiary/shop/Shop";
import itemShop from "../beastiary/shop/shops/ItemShop";
import handleUserError from "../discordUtility/handleUserError";
import { betterSend } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildItemShopEmbed from "../embedBuilders/buildItemShop";
import { Player } from "../models/Player";
import { CommandSection, GuildCommand } from "../structures/Command";
import { GuildCommandParser } from "../structures/CommandParser";

export default class ShopCommand extends GuildCommand {
    public readonly commandNames = ["shop", "s"];

    public readonly info = "View and use the item shop";

    public readonly section = CommandSection.gettingStarted;

    public help(displayPrefix: string): string {
        return stripIndents`
            Use \`${displayPrefix}${this.commandNames[0]}\` to view the item shop.

            Use \`${displayPrefix}${this.commandNames[0]}\` \`buy\` \`<item number>\` \`<quantity>\` to buy items.
        `;
    }

    private buildAndSendShopMessage(channel: TextChannel, player: Player): void {
        const shopEmbed = new SmartEmbed();
        buildItemShopEmbed(shopEmbed, player);

        const shopMessage = new APIMessage(channel, { embed: shopEmbed });
        betterSend(channel, shopMessage);
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        let player: Player;
        try {
            player = await beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(`There was an error fetching a player in the shop command: ${error}`);
        }

        if (parsedMessage.arguments.length < 1) {
            this.buildAndSendShopMessage(parsedMessage.channel, player);
            return;
        }

        const shopOption = parsedMessage.arguments[0].text.toLowerCase();

        if (shopOption === "buy") {
            if (parsedMessage.arguments.length < 2) {
                betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
                return;
            }

            const shopIndex = Number(parsedMessage.arguments[1].text) - 1;

            if (isNaN(shopIndex)) {
                betterSend(parsedMessage.channel, "The item number you want to buy needs to be a number.");
                return;
            }

            let itemQuantity = 1;
            if (parsedMessage.arguments.length > 2) {
                itemQuantity = Number(parsedMessage.arguments[2].text);

                if (isNaN(itemQuantity)) {
                    betterSend(parsedMessage.channel, "The quantity of items you want to purchase must be a number.");
                    return;
                }
            }

            let purchaseReceipt: ShopReceipt;
            try {
                purchaseReceipt = itemShop.attemptToPurchase(shopIndex, player, itemQuantity);
            }
            catch (error) {
                handleUserError(parsedMessage.channel, error);
                return;
            }

            betterSend(parsedMessage.channel, `Purchase successful. You bought **${purchaseReceipt.nameAndQuantity}** for **${purchaseReceipt.totalPrice}** scraps.`);
        }
    }
}