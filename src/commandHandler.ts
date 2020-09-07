import { Message } from 'discord.js';

import Command from './commands/commandInterface';
import CommandParser from './utility/commandParser';
import { SubmitSpeciesCommand } from './commands/submitSpeciesCommand';
import { betterSend } from './utility/toolbox';
import { SendPendingSubmissionsCommand } from './commands/sendPendingSubmissionsCommand';
import { ApprovePendingSpeciesCommand } from './commands/approvePendingSpeciesCommand';
import { SpeciesInfoCommand } from './commands/speciesInfoCommand';
import { EncounterCommand } from './commands/encounterCommand';

// The class responsible for executing commands
export default class CommandHandler {
    // The bot's prefix that it will respond to
    private readonly prefix: string;

    // The array of valid, executable commands
    private readonly commands: Command[];

    constructor(prefix: string) {
        // The prefix that the bot will respond to
        this.prefix = prefix;

        // Initialize an array of classes that represent the bot's valid commands
        const commandClasses = [
            ApprovePendingSpeciesCommand,
            EncounterCommand,
            SubmitSpeciesCommand,
            SendPendingSubmissionsCommand,
            SpeciesInfoCommand
        ];

        // Assign the array of commands to a new instance of each command class
        this.commands = commandClasses.map(commandClass => new commandClass());
    }

    // Executes user commands contained in a message if appropriate
    public async handleMessage(message: Message): Promise<void> {
        // If the message was sent by a bot, or was sent in a news channel
        if (message.author.bot || message.channel.type === 'news') {
            // Ignore the message
            return;
        }

        // If the message is a command
        if (this.isCommand(message)) {
            // Create a new command parser with the given message, which will be parsed into its constituent parts within the parser instance
            const commandParser = new CommandParser(message, this.prefix);

            // Find a command class that matches the command specified in the message
            const matchedCommand = this.commands.find(command => command.commandNames.includes(commandParser.parsedCommandName));

            // If no matching command was found
            if (!matchedCommand) {
                betterSend(commandParser.channel, `I don't recognize that command. Try ${this.prefix}help.`);
            }
            // If a matching command was found
            else {
                // Run the command and check for errors
                try {
                    await matchedCommand.run(commandParser);
                }
                catch (error) {
                    console.error('Command execution failed.', error);
                    return;
                }
            }
        }
    }

    // Determines whether or not a message is a user command.
    private isCommand(message: Message): boolean {
        return message.content.startsWith(this.prefix);
    }
}