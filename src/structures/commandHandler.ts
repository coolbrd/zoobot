import { Guild, Message } from 'discord.js';

import Command from '../commands/commandInterface';
import CommandParser from './commandParser';
import { SubmitSpeciesCommand } from '../commands/submitSpeciesCommand';
import { betterSend } from "../discordUtility/messageMan";
import { SendPendingSubmissionsCommand } from '../commands/sendPendingSubmissionsCommand';
import { ApprovePendingSpeciesCommand } from '../commands/approvePendingSpeciesCommand';
import { SpeciesInfoCommand } from '../commands/speciesInfoCommand';
import { EncounterCommand } from '../commands/encounterCommand';
import { ViewInventoryCommand } from '../commands/viewInventoryCommand';
import { ChangeGuildPrefixCommand } from '../commands/changeGuildPrefixCommand';
import { GuildModel } from '../models/guild';

// The class responsible for executing commands
export default class CommandHandler {
    // The bot's prefix that it will respond to
    private readonly prefix: string;

    // The array of valid, executable commands
    private readonly commands: Command[];

    // The map of guilds and their custom prefixes
    private readonly guildPrefixes: Map<string, string> = new Map();

    constructor(prefix: string) {
        // The prefix that the bot will respond to
        this.prefix = prefix;

        // Initialize an array of classes that represent the bot's valid commands
        const commandClasses = [
            ApprovePendingSpeciesCommand,
            ChangeGuildPrefixCommand,
            EncounterCommand,
            SubmitSpeciesCommand,
            SendPendingSubmissionsCommand,
            SpeciesInfoCommand,
            ViewInventoryCommand
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
            const commandParser = new CommandParser(message, this.getGuildPrefix(message.guild));

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

    // Returns the prefix to use for a given guild id, returns the default prefix if the guild has not set one
    private getGuildPrefix(guild: Guild | null): string {
        return guild ? this.guildPrefixes.get(guild.id) || this.prefix : this.prefix;
    }

    // Determines whether or not a message is a user command.
    private isCommand(message: Message): boolean {
        // Determine the prefix to use for this message's guild of origin (if any)
        const prefix = this.getGuildPrefix(message.guild);

        // Check if the sent message starts with the proper prefix
        return message.content.startsWith(prefix);
    }

    // Loads the map of guild prefixes to respond to in each given guild
    public async loadGuildPrefixes(): Promise<void> {
        // Find all known guild documents
        const guildDocuments = await GuildModel.find({}, { _id: 0, id: 1, config: 1 });

        // Clear any possible current entries in the prefix map
        this.guildPrefixes.clear();
        // Iterate over every document returned
        for (const guildDocument of guildDocuments) {
            // Add each guild and its prefix to the map
            this.guildPrefixes.set(guildDocument.get('id'), guildDocument.get('config').prefix);
        }
    }

    public changeGuildPrefix(guildId: string, newPrefix: string): void {
        this.guildPrefixes.set(guildId, newPrefix);
    }
}