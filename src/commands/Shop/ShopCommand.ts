import { stripIndent } from "common-tags";
import { APIMessage, TextChannel } from "discord.js";
import { beastiary } from "../../beastiary/Beastiary";
import { betterSend } from "../../discordUtility/messageMan";
import SmartEmbed from "../../discordUtility/SmartEmbed";
import buildItemShopEmbed from "../../embedBuilders/buildItemShop";
import { Player } from "../../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";
import ShopBuySubCommand from "./ShopBuySubCommand";

class ShopCommand extends GuildCommand {
    public readonly commandNames = ["shop"];

    public readonly subCommands = [
        ShopBuySubCommand
    ];

    public readonly info = "View and use the item shop";

    public readonly helpUseString = "to view the item shop.";

    public readonly section = CommandSection.gettingStarted;

    private buildAndSendShopMessage(channel: TextChannel, player: Player): void {
        const shopEmbed = new SmartEmbed();
        buildItemShopEmbed(shopEmbed, player);

        const shopMessage = new APIMessage(channel, { embed: shopEmbed });
        betterSend(channel, shopMessage);
    }

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        let player: Player;
        try {
            player = await beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player in the shop command.

                Guild member: ${JSON.stringify(parsedMessage.member)}
                
                ${error}
            `);
        }

        this.buildAndSendShopMessage(parsedMessage.channel, player);
        return commandReceipt;
    }
}
export default new ShopCommand();