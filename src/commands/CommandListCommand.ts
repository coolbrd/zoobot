import { APIMessage } from "discord.js";
import { betterSend } from "../discordUtility/messageMan";
import SmartEmbed from "../discordUtility/SmartEmbed";
import Command from "../structures/Command";
import { commandHandler } from "../structures/CommandHandler";
import CommandParser from "../structures/CommandParser";

// Sends an embed containing a list of all non-admin commands and their basic functions
export default class CommandListCommand implements Command {
    public readonly commandNames = ["commands", "commandlist", "listcommands", "command"];

    public readonly info = "View this message";

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` to get an overview of all commands and their functions.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        let commandListString = "Here's a list of all the things I can do:\n\n";

        // Add the command info string of all non-admin commands
        for (const command of commandHandler.commands) {
            if (!command.adminOnly) {
                commandListString += `\`${command.commandNames[0]}\`: ${command.info}\n`;
            }
        }

        const embed = new SmartEmbed();

        embed.setTitle("Commands");

        embed.setDescription(commandListString);

        embed.setColor(0x18476b);
        
        betterSend(parsedUserCommand.channel, new APIMessage(parsedUserCommand.channel, { embed: embed }));
    }
}