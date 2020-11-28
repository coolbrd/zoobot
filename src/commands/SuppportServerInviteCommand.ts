import BeastiaryClient from "../bot/BeastiaryClient";
import gameConfig from "../config/gameConfig";
import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class SupportServerInviteCommand extends GuildCommand {
    public readonly commandNames = ["support", "supportserver", "invite"];

    public readonly info = "Get the link to the official support server";

    public readonly helpUseString = "to get the link to the bot's official support server, where you can annoy the developer.";

    public readonly section = CommandSection.getInvolved;

    public async run(parsedMessage: CommandParser, commandReceipt: CommandReceipt, _beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        betterSend(parsedMessage.channel, gameConfig.supportServerInviteLink);

        return commandReceipt;
    }
}
export default new SupportServerInviteCommand();