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

    public readonly sections = [CommandSection.guildManagement];

    public readonly permissionRequirement = "MANAGE_GUILD";

    public async run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();

        const prefix = parsedMessage.restOfText;

        if (!prefix) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        if (prefix.length >= 128) {
            betterSend(parsedMessage.channel, "Why would you want a prefix that long? For you own safety, I'm not gonna do that.");
            return commandReceipt;
        }

        let playerGuild: PlayerGuild | undefined;
        try {
            playerGuild = await beastiaryClient.beastiary.playerGuilds.fetchByGuildId(parsedMessage.guild.id);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error attempting to get a guild object from a guild id.

                Guild id: ${parsedMessage.guild.id}
                
                ${error}
            `);
        }

        if (!playerGuild) {
            throw new Error(stripIndent`
                No player guild could be found for a guild in the change guild prefix command.
            `);
        }

        playerGuild.prefix = prefix;

        beastiaryClient.commandHandler.changeGuildPrefix(playerGuild.guildId, prefix);

        betterSend(parsedMessage.channel, `Success. My prefix is now \`${prefix}\`.`);

        return commandReceipt;
    }
}
export default new ChangeGuildPrefixCommand();