import CommandParser from "../structures/CommandParser";
import { betterSend } from "../discordUtility/messageMan";
import Command from "../structures/Command";
import { PlayerGuild } from "../models/Guild";
import { commandHandler } from "../structures/CommandHandler";
import { beastiary } from "../beastiary/Beastiary";

// Changes the command prefix for a given guild
export default class ChangeGuildPrefixCommand implements Command {
    public readonly commandNames = ["prefix", "changeprefix"];

    public help(prefix: string): string {
        return `Use \`${prefix}prefix\` \`<new command prefix>\` to change the prefix that I respond to.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        // Make sure this command is only used in guilds
        if (parsedUserCommand.channel.type === "dm") {
            betterSend(parsedUserCommand.channel, "This command can only be used in servers.");
            return;
        }

        // Get the full text after the initial command text
        const fullPrefix = parsedUserCommand.fullArguments;

        // Make sure a prefix to use was provided
        if (!fullPrefix) {
            betterSend(parsedUserCommand.channel, this.help(parsedUserCommand.commandPrefix));
            return;
        }

        let guildObject: PlayerGuild;
        // Get the target guild's document
        try {
            guildObject = await beastiary.playerGuilds.fetch(parsedUserCommand.channel.guild.id);
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

        betterSend(parsedUserCommand.channel, `Success. My prefix is now \`${fullPrefix}\`.`);
    }
}