import { betterSend } from "../discordUtility/messageMan";
import Command, { CommandSection } from "../structures/Command";
import { commandHandler } from "../structures/CommandHandler";
import CommandParser from "../structures/CommandParser";

// Sends a message containing the alternate command names of a given command
export default class CommandAliasesCommand implements Command {
    public readonly commandNames = ["alias", "aliases", "a"];

    public readonly info = "View the alternate names and abbreviations of a command";

    public readonly section = CommandSection.info;

    public help(displayPrefix: string): string {
        return `Use \`${displayPrefix}${this.commandNames[0]}\` to view the valid aliases of a command.`;
    }

    public async run(parsedUserCommand: CommandParser): Promise<void> {
        const commandName = parsedUserCommand.fullArguments.toLowerCase();

        // If the user didn't provide a command name to search
        if (!commandName) {
            betterSend(parsedUserCommand.channel, this.help(parsedUserCommand.displayPrefix));
            return;
        }

        // Try to find a command by the given search term
        const command = commandHandler.getCommand(commandName.toLowerCase(), parsedUserCommand.originalMessage);

        // If no command by that name exists
        if (!command) {
            betterSend(parsedUserCommand.channel, `No command by the name "${commandName}" exists.`);
            return;
        }

        let aliasString = "";
        // Start iterating over the command names at the second name
        for (let i = 1; i < command.commandNames.length; i++) {
            // Add each command name with commas between them
            aliasString += `\`${command.commandNames[i]}\``;
            if (i < command.commandNames.length - 1) {
                aliasString += ", ";
            }
        }
        aliasString = aliasString || "None";

        betterSend(parsedUserCommand.channel, `Aliases for \`${command.commandNames[0]}\`: ${aliasString}`);
    }
}