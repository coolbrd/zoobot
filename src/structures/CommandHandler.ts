import { Guild, Message, User } from 'discord.js';
import { Document } from 'mongoose';

import Command from './CommandInterface';
import CommandParser from './CommandParser';
import SubmitSpeciesCommand from '../commands/SubmitSpeciesCommand';
import { betterSend } from "../discordUtility/messageMan";
import SendPendingSubmissionsCommand from '../commands/SendPendingSubmissionsCommand';
import ApprovePendingSpeciesCommand from '../commands/ApprovePendingSpeciesCommand';
import SpeciesInfoCommand from '../commands/SpeciesInfoCommand';
import EncounterCommand from '../commands/EncounterCommand';
import ViewInventoryCommand from '../commands/ViewInventoryCommand';
import ChangeGuildPrefixCommand from '../commands/ChangeGuildPrefixCommand';
import { GuildModel } from '../models/Guild';
import { client } from '..';
import HelpCommand from '../commands/HelpCommand';
import MoveAnimalsCommand from '../commands/MoveAnimalsCommand';
import { ADMIN_SERVER_ID } from '../config/secrets';
import ChangeAnimalNicknameCommand from '../commands/ChangeAnimalNicknameCommand';
import AnimalInfoCommand from '../commands/AnimalInfoCommand';
import EditSpeciesCommand from '../commands/EditSpeciesCommand';
import { errorHandler } from './ErrorHandler';
import BeastiaryCommand from '../commands/BeastiaryCommand';
import config from '../config/BotConfig';

// The class responsible for executing commands
class CommandHandler {
    // The bot's prefix that it will respond to
    private readonly prefix: string;

    // The array of valid, executable commands
    private readonly commands: Command[];

    // The map of guilds and their custom prefixes
    private readonly guildPrefixes: Map<string, string> = new Map();

    constructor() {
        // Initialize an array of classes that represent the bot's valid commands
        const commandClasses = [
            AnimalInfoCommand,
            ApprovePendingSpeciesCommand,
            BeastiaryCommand,
            ChangeAnimalNicknameCommand,
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

        this.prefix = config.prefix;
    }

    // Gets a command by one of its names
    public getCommand(commandName: string, message?: Message): Command | undefined {
        // Find a command that matches the given string
        const foundCommand = this.commands.find(command => {
            return command.commandNames.includes(commandName);
        });

        // If nothing was found, return nothing
        if (!foundCommand) {
            return undefined;
        }

        // If a command was found, it's admin only, and either no message was provided or the message isn't in an admin server
        if (foundCommand.adminOnly && (!message || !this.inAdminServer(message))) {
            // Return nothing (act like the admin commands don't exist)
            return undefined;
        }

        // If the above checks were passed, just return the found command
        return foundCommand;
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

            // Find a command class that matches the command specified in the message (taking into account the visibilit of admin commands)
            const matchedCommand = this.getCommand(commandParser.parsedCommandName, message);

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
                    errorHandler.handleError(error, 'Command execution failed.');

                    betterSend(commandParser.channel, 'Something went wrong while performing that command. Please report this to the developer.');
                    return;
                }
            }
        }
    }

    // Tells whether or not a given message is in the admin server
    private inAdminServer(message: Message): boolean {
        if (message.channel.type === 'dm') {
            return false;
        }
        return message.channel.guild.id === ADMIN_SERVER_ID;
    }

    // Returns the prefix to use for a given guild id, returns the default prefix if the guild has not set one
    public getGuildPrefix(guild: Guild | null): string {
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
        let guildDocuments: Document[] | null;
        // Find all known guild documents
        try {
            guildDocuments = await GuildModel.find({}, { _id: 0, id: 1, config: 1 });
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error attempting to load guild prefixes from the database.');
            return;
        }

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
export const commandHandler = new CommandHandler();