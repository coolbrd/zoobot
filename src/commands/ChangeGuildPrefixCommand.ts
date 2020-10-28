import { GuildCommandParser } from "../structures/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import { CommandSection, GuildCommand } from "../structures/Command";
import { PlayerGuild } from "../models/Guild";
import { commandHandler } from "../structures/CommandHandler";
import { beastiary } from "../beastiary/Beastiary";

// Changes the command prefix for a given guild
export default class ChangeGuildPrefixCommand extends GuildCommand {
    public readonly commandNames = ["prefix", "changeprefix"];

    public readonly info = "Change the prefix I respond to";

    public readonly section = CommandSection.guildManagement;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` \`<new command prefix>\` to change the prefix that I respond to.`;
    }

    public async run(parsedMessage: GuildCommandParser): Promise<void> {
        // Get the full text after the initial command text
        const fullPrefix = parsedMessage.fullArguments;

        // Make sure a prefix to use was provided
        if (!fullPrefix) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.commandPrefix));
            return;
        }

        // Get the target guild's document
        let guildObject: PlayerGuild;
        try {
            guildObject = await beastiary.playerGuilds.fetchByGuildId(parsedMessage.guild.id);
        }
        catch (error) {
            throw new Error(`There was an error attempting to get a guild object from a guild id: ${error}`);
        }

        // Attempt to change the guild's prefix
        try {
            await guildObject.setPrefix(fullPrefix);
        }
        catch (error) {
            throw new Error(`There was an error trying to change the prefix of a guild object: ${error}`);
        }

        // Update the guild's prefix in the command handler
        commandHandler.changeGuildPrefix(guildObject.guildId, fullPrefix);

        betterSend(parsedMessage.channel, `Success. My prefix is now \`${fullPrefix}\`.`);
    }
}