import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import gameConfig from "../config/gameConfig";
import { betterSend } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import Command, { CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class PremiumInfoCommand extends Command {
    public readonly names = ["premium", "premiuminfo"];

    public readonly info = "See the perks of premium";

    public readonly helpUseString = "to see all the specific benefits of having premium status.";

    public readonly sections = [CommandSection.info];

    public async run(parsedMessage: CommandParser, _beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const embed = new SmartEmbed();

        embed.setColor(0xf9ff56);

        embed.setTitle("The Perks of Premium");

        embed.setDescription(stripIndent`
            Ever wonder why you should pay money for any of this? Here's the pitch!
            If you're sold, you can subscribe at <${gameConfig.patreonLink}>.
        `);

        embed.addField("Encounter reset rate: **x2**", "Twice the encounters, from 2 per hour to **2 every 30 minutes**, totalling **96 per day**.", true);
        embed.addField("Free encounter max stack: **x3**", "Save up to **15** free encounters at a time, wasting less when you can't play.", true)
        embed.addField("Capture reset rate: **x2**", "Twice the captures, from 1 every 4 hours to **1 every 2 hours**. **12 per day** if you use them all!");
        embed.addField("Xp boost reset rate: **x2**", "Twice the xp boosts, from 1 every hour to **1 every 30 minutes**. Boost your animals to the max!", true);
        embed.addField("Crew size: **x2**", "Double the space in your crew, allowing more of your animals to passively gain xp!", true);
        embed.addField("Crew animals gain xp for __every__ message you send", "Want a reward for being extra active in your server? This is it.", true);
        embed.addField("*Support the creator!*", "Hey, this all takes a lot of effort to make, not to mention the fees for keeping it up! If you help me out in this way, I'd really appreciate it. :)");

        embed.setFooter("Pretty please?");

        betterSend(parsedMessage.channel, embed);

        return this.newReceipt();
    }
}
export default new PremiumInfoCommand();