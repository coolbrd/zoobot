import { GuildCommandParser } from "../structures/Command/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command/Command";
import { PlayerGuild } from "../structures/GameObject/GameObjects/PlayerGuild";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";
import BeastiaryClient from "../bot/BeastiaryClient";

class ChangeGuildPrefixCommand extends GuildCommand {
    public readonly names = ["prefix", "changeprefix"];

    public readonly info = "Change the prefix I respond to";

    public readonly helpUseString = "`<new command prefix>` to change the prefix that I respond to.";

    public readonly section = CommandSection.guildManagement;

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        if (!parsedMessage.member.hasPermission("MANAGE_GUILD")) {
            betterSend(parsedMessage.channel, "You need the `Manage Server` permission to use this command.");
            return commandReceipt;
        }

        const prefix = parsedMessage.restOfText;

        if (!prefix) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        let guildObject: PlayerGuild;
        try {
            guildObject = await beastiaryClient.beastiary.playerGuilds.fetchByGuildId(parsedMessage.guild.id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error attempting to get a guild object from a guild id.

                Guild id: ${parsedMessage.guild.id}
                
                ${error}
            `);
        }

        guildObject.prefix = prefix;

        beastiaryClient.commandHandler.changeGuildPrefix(guildObject.guildId, prefix);

        betterSend(parsedMessage.channel, `Success. My prefix is now \`${prefix}\`.`);

        return commandReceipt;
    }
}
export default new ChangeGuildPrefixCommand();