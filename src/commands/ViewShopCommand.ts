import { stripIndents } from "common-tags";
import { APIMessage, TextChannel } from "discord.js";
import { beastiary } from "../beastiary/Beastiary";
import { betterSend } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import buildItemShopEmbed from "../embedBuilders/buildItemShop";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { GuildCommandParser } from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";
import ShopBuySubCommand from "./ShopBuySubCommand";

class ViewShopCommand extends GuildCommand {
    public readonly commandNames = ["shop"];

    public readonly subCommands = [
        ShopBuySubCommand
    ];

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

    public async run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        let player: Player;
        try {
            player = await beastiary.players.fetch(parsedMessage.member);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error fetching a player in the shop command.

                Guild member: ${JSON.stringify(parsedMessage.member)}
                
                ${error}
            `);
        }

        this.buildAndSendShopMessage(parsedMessage.channel, player);
        return commandReceipt;
    }
}
export default new ViewShopCommand();