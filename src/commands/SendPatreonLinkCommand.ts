import { stripIndents } from "common-tags";
import gameConfig from "../config/gameConfig";
import { betterSend } from "../discordUtility/messageMan";
import Command, { CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class SendPatreonLinkCommand extends Command {
    public readonly commandNames = ["patreon", "donate"];

    public readonly info = "Support the bot and its creator and unlock premium features";

    public readonly helpUseString = "to get the link to my Patreon page, where you can donate and get premium perks.";

    public readonly section = CommandSection.getInvolved;

    public async run(parsedMessage: CommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        betterSend(parsedMessage.channel, stripIndents`
            Show your support by donating, it would mean a lot!
            Donating can also get you exclusive premium features. Learn more with \`${parsedMessage.displayPrefix}premium\`.
            ${gameConfig.patreonLink}
        `);

        return commandReceipt;
    }
}
export default new SendPatreonLinkCommand();