import { Message } from "discord.js";
import { GreetCommand, TimeCommand } from "./commands";
import Command from "./commands/commandInterface";
import CommandParser from "./utility/commandParser";
import { guildAnimalChance } from "./zoo/encounter";

// The class responsible for parsing and executing commands
// Will be the default item imported from this module within other modules
export default class CommandHandler {
    // The array of valid, executable commands
    private commands: Command[];

    // The bot's prefix that it will respond to
    private readonly prefix: string;

    // Upon initialization
    constructor(prefix: string) {
        // Initialize an array of classes that represent the bot's valid commands
        const commandClasses = [
            GreetCommand,
            TimeCommand
        ];

        // Assign the array of commands to a new instance of each command class
        this.commands = commandClasses.map(commandClass => new commandClass());
        // Set the bot's prefix
        this.prefix = prefix;
    }

    // Executes user commands contained in a message if appropriate
    async handleMessage(message: Message): Promise<void> {
        // If the message was sent by a bot
        if (message.author.bot) {
            // Ignore the message
            return;
        }

        // Get the guild that the message was sent in, if any
        const sourceGuild = message.guild;
        // If the message was sent in a guild
        if (sourceGuild) {
            // If the guild is unavailable for operation, usually due to a server outage
            if (!sourceGuild.available) {
                // Don't attempt to perform any command logic
                return;
            }
            // At this point it's known that the guild is available for operation

            // Possibly spawn an animal in the guild
            guildAnimalChance(sourceGuild);
        }

        // If the message is a command
        if (this.isCommand(message)) {
            // Create a new command parser with the given message, which will be parsed into its constituent parts within the parser instance
            const commandParser = new CommandParser(message, this.prefix);

            // Find a command class that matches the command specified in the message
            const matchedCommand = this.commands.find(command => command.commandNames.includes(commandParser.parsedCommandName));

            // If no matching command was found
            if (!matchedCommand) {
                await message.reply(`I don't recognize that command. Try ${this.prefix}help.`);
            }
            // If a matching command was found
            else {
                // Run the command and check for errors
                await matchedCommand.run(commandParser).catch(error => {
                    message.reply(`'${this.echoMessage(message)}' failed because of ${error}`);
                });
            }
        }
    }

    // Sends back the message content after removing the prefix.
    echoMessage(message: Message): string {
        return message.content.replace(this.prefix, "").trim();
    }

    // Determines whether or not a message is a user command.
    private isCommand(message: Message): boolean {
        return message.content.startsWith(this.prefix);
    }
}