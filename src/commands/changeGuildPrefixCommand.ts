import CommandParser from "../structures/commandParser";
import { betterSend } from "../discordUtility/messageMan";
import Command from "../structures/commandInterface";
import { getGuildObject } from "../zoo/userManagement";
import { GuildObject } from "../models/guild";
import { errorHandler } from "../structures/errorHandler";
import { commandHandler } from "../structures/commandHandler";

// Changes the command prefix for a given guild
export default class ChangeGuildPrefixCommand implements Command {
    public readonly commandNames = ['prefix', 'changeprefix'];

    public help(prefix: string): string {
        return `Use \`${prefix}prefix\` \`<new command prefix>\` to change the prefix that I respond to.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // Make sure this command is only used in guilds
        if (parsedUserCommand.channel.type === 'dm') {
            betterSend(parsedUserCommand.channel, 'This command can only be used in servers.');
            return;
        }

        // Get the full text after the initial command text
        const fullPrefix = parsedUserCommand.fullArguments;

        // Make sure a prefix to use was provided
        if (!fullPrefix) {
            betterSend(parsedUserCommand.channel, this.help(parsedUserCommand.commandPrefix));
            return;
        }

        let guildObject: GuildObject;
        // Get the target guild's document
        try {
            guildObject = await getGuildObject(parsedUserCommand.channel.guild);
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error attempting to get a guild object from a guild id.');
            return;
        }

        // Attempt to change the guild's prefix
        try {
            await guildObject.setPrefix(fullPrefix);
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error trying to change the prefix of a guild object.');
            return;
        }

        // Update the guild's prefix in the command handler
        commandHandler.changeGuildPrefix(guildObject.getGuildId(), fullPrefix);

        betterSend(parsedUserCommand.channel, `Success. My prefix is now \`${fullPrefix}\`.`);
    }
}