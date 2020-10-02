import CommandParser from "../structures/commandParser";
import { betterSend } from "../discordUtility/messageMan";
import Command from "../structures/commandInterface";
import { getGuildObject } from "../zoo/userManagement";
import { commandHandler } from '..';

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

        // Get the target guild's document
        const guildObject = await getGuildObject(parsedUserCommand.channel.guild);
        
        // Attempt to change the guild's prefix
        try {
            await guildObject.setPrefix(fullPrefix);
            // Update the guild's prefix in the command handler
            commandHandler.changeGuildPrefix(guildObject.getGuildId(), fullPrefix);
        }
        catch (error) {
            console.error('There was an error trying to change the prefix of a guild object.');
            throw new Error(error);
        }

        betterSend(parsedUserCommand.channel, `Success. My prefix is now \`${fullPrefix}\`.`);
    }
}