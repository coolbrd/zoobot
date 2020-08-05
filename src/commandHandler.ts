import { Message, MessageReaction, User, PartialUser } from "discord.js";
import { GreetCommand, TimeCommand } from "./commands";
import Command from "./commands/commandInterface";
import CommandParser from "./utility/commandParser";
import { guildAnimalChance } from "./zoo/encounter";
import InteractiveMessage from "./utility/interactiveMessage";

// The class responsible for parsing and executing commands
// Will be the default item imported from this module within other modules
export default class CommandHandler {
    // The bot's prefix that it will respond to
    private readonly prefix: string;

    // The array of valid, executable commands
    private readonly commands: Command[];

    readonly interactiveMessages = new Map<string, InteractiveMessage>();

    // Upon initialization
    constructor(prefix: string) {
        // The prefix that the bot will respond to
        this.prefix = prefix;

        // Initialize an array of classes that represent the bot's valid commands
        const commandClasses = [
            GreetCommand,
            TimeCommand
        ];

        // Assign the array of commands to a new instance of each command class
        this.commands = commandClasses.map(commandClass => new commandClass());
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

            // Possibly spawn an animal in the guild and get the resulting interactive message, if there is one
            const possibleMessage = await guildAnimalChance(sourceGuild);
            // If an animal spawned and a message was returned
            if (possibleMessage) {
                // Cast the message as an interactive message
                const encounterMessage = possibleMessage as InteractiveMessage;
                // Add the message to the map of interactive messages to handle
                this.interactiveMessages.set(encounterMessage.getMessage().id, encounterMessage);
            }
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

    // Takes a user's message reaction and potentially activates an interactive message
    async handleReaction(messageReaction: MessageReaction) {
        // Check the map of interactive messages for a message with the id of the one reacted to
        const possibleMessage = this.interactiveMessages.get(messageReaction.message.id);
        // If a message was found
        if (possibleMessage) {
            // Cast the possible message as an interactive message
            const interactiveMessage = possibleMessage as InteractiveMessage;

            // Activate the message's button that corresponds to the emoji reacted with
            await interactiveMessage.buttonPress(messageReaction.emoji.toString());
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