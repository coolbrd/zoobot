import BeastiaryClient from "../bot/BeastiaryClient";
import gameConfig from "../config/gameConfig";
import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class SendInviteLinkCommand extends GuildCommand {
    public readonly names = ["invite"];

    public readonly info = "Get the bot's invite link";

    public readonly helpUseString = "to get the link to invite me to other servers.";

    public readonly sections = [CommandSection.getInvolved];

    public async run(parsedMessage: CommandParser, _beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        betterSend(parsedMessage.channel, gameConfig.botInviteLink);

        return commandReceipt;
    }
}
export default new SendInviteLinkCommand();