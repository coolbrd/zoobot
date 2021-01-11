import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import Command, { CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class VoteCommand extends Command {
    public readonly names = ["vote"];

    public readonly info = "Vote for the bot and receive rewards";

    public readonly helpUseString = "to view information about how to vote.";

    public readonly sections = [CommandSection.gettingStarted, CommandSection.getInvolved];

    public async run(parsedMessage: CommandParser, _beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const embed = new SmartEmbed();

        embed.setTitle("Voting");
        embed.setColor(0xf75142);
        embed.setDescription("Whenever you can, vote on any of these websites for free extra encounters!");
        embed.addField("Infinity Bot List", "[Vote](https://infinitybotlist.com/bots/737387258683850892/vote)", true);
        embed.addField("DiscordBots", "[Vote](https://discordbots.co/bot/737387258683850892)", true);
        embed.setFooter("The number of extra encounters you are rewarded is equal to your max stack value of free encounters.");

        betterSend(parsedMessage.channel, embed);

        return this.newReceipt();
    }
}
export default new VoteCommand();