import { Guild, Message, User } from "discord.js";
import { Document } from "mongoose";
import Command from "./Command";
import CommandParser, { GuildCommandParser } from "./CommandParser";
import SubmitSpeciesCommand from "../commands/SubmitSpeciesCommand";
import { betterSend } from "../discordUtility/messageMan";
import ApprovePendingSpeciesCommand from "../commands/ApprovePendingSpeciesCommand";
import SpeciesInfoCommand from "../commands/SpeciesInfoCommand";
import EncounterCommand from "../commands/EncounterCommand";
import ViewCollectionCommand from "../commands/ViewCollectionCommand";
import ChangeGuildPrefixCommand from "../commands/ChangeGuildPrefixCommand";
import { GuildModel, PlayerGuild } from "../models/Guild";
import { client } from "..";
import HelpCommand from "../commands/HelpCommand";
import MoveAnimalsCommand from "../commands/MoveAnimalsCommand";
import { ADMIN_SERVER_ID } from "../config/secrets";
import ChangeAnimalNicknameCommand from "../commands/ChangeAnimalNicknameCommand";
import AnimalInfoCommand from "../commands/AnimalInfoCommand";
import EditSpeciesCommand from "../commands/EditSpeciesCommand";
import { errorHandler } from "./ErrorHandler";
import BeastiaryCommand from "../commands/BeastiaryCommand";
import config from "../config/BotConfig";
import CommandListCommand from "../commands/CommandListCommand";
import CommandAliasesCommand from "../commands/CommandAliasesCommand";
import ViewCaptureResetCommand from "../commands/ViewCaptureResetCommand";
import ViewEncounterResetCommand from "../commands/ViewEncounterResetCommand";
import ReleaseAnimalCommand from "../commands/ReleaseAnimalCommand";
import ExitCommand from "../commands/ExitCommand";
import ViewPlayerProfileCommand from "../commands/ViewPlayerProfileCommand";
import CrewAddCommand from "../commands/CrewAddCommand";
import ViewCrewCommand from "../commands/ViewCrewCommand";
import CrewRemoveCommand from "../commands/CrewRemoveCommand";

// The class responsible for executing commands
class CommandHandler {
    // The bot's default that it will respond to
    private readonly prefix: string;

    // The array of valid, executable commands
    public readonly commands: Command[];

    // The set of user ids corresponding to users that have initiated a command that's still in progress (for applicable commands)
    private readonly usersLoadingCommands = new Set<string>();

    // The map of guilds and their custom prefixes
    private readonly guildPrefixes: Map<string, string> = new Map();

    constructor() {
        // Initialize an array of classes that represent the bot's valid commands
        const commandClasses = [
            HelpCommand,
            BeastiaryCommand,
            SpeciesInfoCommand,
            EncounterCommand,
            ViewCollectionCommand,
            ViewPlayerProfileCommand,
            AnimalInfoCommand,
            ChangeAnimalNicknameCommand,
            CrewAddCommand,
            CrewRemoveCommand,
            ViewCrewCommand,
            MoveAnimalsCommand,
            ReleaseAnimalCommand,
            ChangeGuildPrefixCommand,
            ViewEncounterResetCommand,
            ViewCaptureResetCommand,
            CommandAliasesCommand,
            CommandListCommand,
            EditSpeciesCommand,
            SubmitSpeciesCommand,
            ApprovePendingSpeciesCommand,
            ExitCommand
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
        if (message.author.bot || message.channel.type === "news") {
            // Ignore the message
            return;
        }

        // Check the message for a valid prefix
        const messagePrefix = this.prefixUsed(message);
        // If the message contained a valid prefix
        if (messagePrefix) {
            // Whether or not the message was sent in a guild
            const inGuild = Boolean(message.guild);

            // The default prefix to use for help message display
            const guildPrefix = this.getGuildPrefix(message.guild);

            // Create a new command parser with the given message, which will be parsed into its constituent parts within the parser instance
            let parsedMessage: CommandParser | GuildCommandParser;
            if (inGuild) {
                parsedMessage = new GuildCommandParser(message, messagePrefix);
            }
            else {
                parsedMessage = new CommandParser(message, messagePrefix);
            }

            // If the user didn't specify a command, just the bot's prefix
            if (!parsedMessage.commandName) {
                // Alleviate confusion
                betterSend(parsedMessage.channel, `Yes? Try using \`${guildPrefix}commands\` to see a list of all my commands.`);
                return;
            }

            // Find a command class that matches the command specified in the message (taking into account the visibilit of admin commands)
            const matchedCommand = this.getCommand(parsedMessage.commandName, message);

            // If no matching command was found
            if (!matchedCommand) {
                betterSend(parsedMessage.channel, `I don't recognize that command. Try \`${guildPrefix}help\`.`);
                return;
            }
            // If a matching command was found
            else {
                // If the message wasn't sent in a guild, and the matched command can only be used in guilds
                if (!inGuild && matchedCommand.guildOnly) {
                    betterSend(parsedMessage.channel, "That command can only be used in servers.");
                    return;
                }

                // If the command blocks input when it's in the process of running
                if (matchedCommand.blocksInput) {
                    // If the player still has an unloaded command that blocks input, don't let another one initiate
                    if (this.userIsLoadingCommand(message.author.id)) {
                        betterSend(parsedMessage.channel, "You're going to fast, one of your last commands hasn't even loaded yet!");
                        return;
                    }
                    // If the user isn't loading any other commands, add their id to the list of users loading commands
                    this.setUserLoadingCommand(message.author.id);
                }

                let commandSuccessful: boolean | void;
                // Run the command
                try {
                    commandSuccessful = await matchedCommand.run(parsedMessage);
                }
                catch (error) {
                    // Handle errors gracefully and inform the user
                    errorHandler.handleError(error, "Command execution failed.");

                    betterSend(parsedMessage.channel, "Something went wrong while performing that command. Please report this to the developer.");
                }
                finally {
                    // After the command runs, remove the user from the set of users loading commands
                    this.unsetUserLoadingCommand(message.author.id);
                }

                // If the bot should react to the message after it's completed the command
                if (matchedCommand.reactConfirm && commandSuccessful) {
                    // Indicate that the command was performed successfully
                    parsedMessage.originalMessage.react("✅").catch(error => {
                        errorHandler.handleError(error, "There was an error attempting to react to a message after a command was completed.");
                    });
                }
            }
        }
    }

    // Tells whether or not a given message is in the admin server
    private inAdminServer(message: Message): boolean {
        if (message.channel.type === "dm") {
            return false;
        }
        return message.channel.guild.id === ADMIN_SERVER_ID;
    }

    // Marks a user as loading a command
    private setUserLoadingCommand(userId: string): void {
        if (this.usersLoadingCommands.has(userId)) {
            throw new Error("A user who was already loading a command was added to the users loading commands list again.");
        }

        this.usersLoadingCommands.add(userId);
    }

    // Marks a user as no longer loading a command
    private unsetUserLoadingCommand(userId: string): void {
        this.usersLoadingCommands.delete(userId);
    }

    // Checks if a user is loading a command
    private userIsLoadingCommand(userId: string): boolean {
        return this.usersLoadingCommands.has(userId);
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
            guildDocuments = await GuildModel.find({});
        }
        catch (error) {
            throw new Error(`There was an error attempting to load guild prefixes from the database: ${error}`);
        }

        // Clear any possible current entries in the prefix map
        this.guildPrefixes.clear();
        // Iterate over every document returned
        for (const guildDocument of guildDocuments) {
            // Add each guild and its prefix to the map
            this.guildPrefixes.set(guildDocument.get(PlayerGuild.fieldNames.guildId), guildDocument.get(PlayerGuild.fieldNames.config).prefix);
        }
    }

    // Changes a guild's prefix in memory only
    public changeGuildPrefix(guildId: string, newPrefix: string): void {
        this.guildPrefixes.set(guildId, newPrefix);
    }
}
export const commandHandler = new CommandHandler();