import { Guild, Message, User } from 'discord.js';

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
import { client } from '..';
import { HelpCommand } from '../commands/helpCommand';
import { MoveAnimalsCommand } from '../commands/moveAnimalsCommand';
import { EditSpeciesCommand } from '../commands/editSpeciesCommand';

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
            EditSpeciesCommand,
            EncounterCommand,
            HelpCommand,
            MoveAnimalsCommand,
            SubmitSpeciesCommand,
            SendPendingSubmissionsCommand,
            SpeciesInfoCommand,
            ViewInventoryCommand
        ];

        // Assign the array of commands to a new instance of each command class
        this.commands = commandClasses.map(commandClass => new commandClass());
    }

    // Gets a command by one of its names
    public getCommand(commandName: string): Command | undefined {
        return this.commands.find(command => {
            return command.commandNames.includes(commandName);
        });
    }

    // Executes user commands contained in a message if appropriate
    public async handleMessage(message: Message): Promise<void> {
        // If the message was sent by a bot, or was sent in a news channel
        if (message.author.bot || message.channel.type === 'news') {
            // Ignore the message
            return;
        }

        // Check the message for a valid prefix
        const messagePrefix = this.prefixUsed(message);
        // If the message contained a valid prefix
        if (messagePrefix) {
            const guildPrefix = this.getGuildPrefix(message.guild);
            // Create a new command parser with the given message, which will be parsed into its constituent parts within the parser instance
            const commandParser = new CommandParser(message, messagePrefix, guildPrefix);

            // Find a command class that matches the command specified in the message
            const matchedCommand = this.getCommand(commandParser.parsedCommandName);

            // If no matching command was found
            if (!matchedCommand) {
                betterSend(commandParser.channel, `I don't recognize that command. Try ${guildPrefix}help.`);
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

    // Determines the prefix used at the beginning of the message, if there is one
    private prefixUsed(message: Message): string | undefined {
        // Get the prefix to be looking for
        const prefix = this.getGuildPrefix(message.guild);

        // If the message starts with the bot's prefix
        if (message.content.startsWith(prefix)) {
            return prefix;
        }

        // The string that represents the bot being tagged by a user
        const tagString = `<@!${(client.user as User).id}>`;
        // If the message starts with the bot's tag
        if (message.content.startsWith(tagString)) {
            // Return the tag string
            return tagString;
        }

        // If the message doesn't start with any valid prefix
        return undefined;
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