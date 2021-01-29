import { betterSend } from "../../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";
import ShopBuySubCommand from "./ShopBuySubCommand";
import BeastiaryClient from "../../bot/BeastiaryClient";

class ShopCommand extends GuildCommand {
    public readonly names = ["shop"];

    public readonly subCommands = [
        ShopBuySubCommand
    ];

    public readonly info = "View and use the item shop";

    public readonly helpUseString = "to view the item shop.";

    public readonly sections = [CommandSection.gettingStarted, CommandSection.gameplay];

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const player = await beastiaryClient.beastiary.players.safeFetch(parsedMessage.member);

        const shopEmbed = beastiaryClient.beastiary.shops.itemShop.buildEmbed(player);

        betterSend(parsedMessage.channel, shopEmbed);

        return this.newReceipt();
    }
}
export default new ShopCommand();