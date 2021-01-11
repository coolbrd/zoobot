import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import Command, { CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class PrivacyCommand extends Command {
    public readonly names = ["privacy"];

    public readonly info = "View The Beastiary's privacy policy";

    public readonly helpUseString = "to view The Beastiary's privacy policy.";

    public async run(parsedMessage: CommandParser, _beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        betterSend(parsedMessage.channel, stripIndent`
            While using The Beastiary, your user and server ids will be collected for internal use. This personal information is collected so the bot can save your progress in the game persistently.
            Collected user and guild ids are referenced upon a user issuing a command that requires previously stored data, and are used to look up player data for the server member who issued the command. Data is not shared with any third parties for any reason.
            Concerns about the bot can be voiced in the bot's public support server, which can be accessed via the "support" command. The support server is also where requests for data removal can be made, which will lead to the purging of all data involving the requested user's id, and server id if necessary and said user has the authority to make that request.
        `);

        return this.newReceipt();
    }
}
export default new PrivacyCommand();