import { stripIndent } from "common-tags";
import { TextChannel } from "discord.js";
import { betterSend } from "../../discordUtility/messageMan";
import SmartEmbed from "../../discordUtility/SmartEmbed";
import buildItemShopEmbed from "../../embedBuilders/buildItemShop";
import { Player } from "../../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../../structures/Command/Command";
import { GuildCommandParser } from "../../structures/Command/CommandParser";
import CommandReceipt from "../../structures/Command/CommandReceipt";
import ShopBuySubCommand from "./ShopBuySubCommand";
import BeastiaryClient from "../../bot/BeastiaryClient";

class ShopCommand extends GuildCommand {
    public readonly commandNames = ["shop"];

    public readonly subCommands = [
        ShopBuySubCommand
    ];

    public readonly info = "View and use the item shop";

    public readonly helpUseString = "to view the item shop.";

    public readonly section = CommandSection.gettingStarted;

    private buildAndSendShopMessage(channel: TextChannel, player: Player, beastiaryClient: BeastiaryClient): void {
        const shopEmbed = new SmartEmbed();
        buildItemShopEmbed(shopEmbed, player, beastiaryClient);

        betterSend(channel, shopEmbed);
    }

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        let player: Player;
        try {
            player = await beastiaryClient.beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a player in the shop command.

                Guild member: ${JSON.stringify(parsedMessage.member)}
                
                ${error}
            `);
        }

        this.buildAndSendShopMessage(parsedMessage.channel, player, beastiaryClient);
        return commandReceipt;
    }
}
export default new ShopCommand();