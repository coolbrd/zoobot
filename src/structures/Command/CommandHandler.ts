import { Guild, Message, User } from "discord.js";
import { Document } from "mongoose";
import Command from "./Command";
import CommandParser, { GuildCommandParser } from "./CommandParser";
import SubmitSpeciesCommand from "../../commands/SubmitSpeciesCommand";
import { betterSend } from "../../discordUtility/messageMan";
import ApprovePendingSpeciesCommand from "../../commands/ApprovePendingSpeciesCommand";
import SpeciesInfoCommand from "../../commands/SpeciesInfoCommand";
import EncounterCommand from "../../commands/EncounterCommand";
import ViewCollectionCommand from "../../commands/ViewCollectionCommand";
import ChangeGuildPrefixCommand from "../../commands/ChangeGuildPrefixCommand";
import { GuildModel } from "../../models/PlayerGuild";
import { PlayerGuild } from "../GameObject/GameObjects/PlayerGuild";
import { client } from "../..";
import HelpCommand from "../../commands/HelpCommand";
import MoveAnimalsCommand from "../../commands/MoveAnimalsCommand";
import ChangeAnimalNicknameCommand from "../../commands/ChangeAnimalNicknameCommand";
import AnimalInfoCommand from "../../commands/AnimalInfoCommand";
import EditSpeciesCommand from "../../commands/EditSpeciesCommand";
import { errorHandler } from "../ErrorHandler";
import BeastiaryCommand from "../../commands/BeastiaryCommand";
import config from "../../config/BotConfig";
import CommandListCommand from "../../commands/CommandListCommand";
import ViewResetsCommand from "../../commands/ViewResetsCommand";
import ReleaseAnimalCommand from "../../commands/ReleaseAnimalCommand";
import ExitCommand from "../../commands/ExitCommand";
import ViewPlayerProfileCommand from "../../commands/ViewPlayerProfileCommand";
import CrewCommand from "../../commands/CrewCommand";
import { ADMIN_SERVER_ID } from "../../config/secrets";
import SpeciesRarityCommand from '../../commands/SpeciesRarityCommand';
import SetEncounterChannelCommand from "../../commands/SetEncounterChannelCommand";
import { stripIndents } from "common-tags";
import CommandAliasesCommand from "../../commands/CommandAliasesCommand";
import FavoriteAnimalCommand from "../../commands/FavoriteAnimalCommand";
import ViewShopCommand from "../../commands/ViewShopCommand";
import ViewScrapsCommand from "../../commands/ViewScrapsCommand";
import CommandReceipt from "./CommandReceipt";

class CommandHandler {
    public readonly baseCommands = [
        HelpCommand,
        EncounterCommand,
        BeastiaryCommand,
        SpeciesInfoCommand,
        ViewCollectionCommand,
        ViewPlayerProfileCommand,
        AnimalInfoCommand,
        ChangeAnimalNicknameCommand,
        ViewScrapsCommand,
        ViewShopCommand,
        CrewCommand,
        FavoriteAnimalCommand,
        MoveAnimalsCommand,
        ReleaseAnimalCommand,
        SetEncounterChannelCommand,
        ChangeGuildPrefixCommand,
        ViewResetsCommand,
        CommandAliasesCommand,
        CommandListCommand,
        EditSpeciesCommand,
        SubmitSpeciesCommand,
        ApprovePendingSpeciesCommand,
        SpeciesRarityCommand,
        ExitCommand
    ];
    private readonly usersLoadingCommands = new Set<string>();
    private readonly guildPrefixes: Map<string, string> = new Map();

    public get botTag(): string {
        return `<@!${(client.user as User).id}>`;
    }

    public getCommand(commandName: string, message: Message): Command | undefined {
        const matchedCommand = this.baseCommands.find(command => {
            return command.commandNames.includes(commandName);
        });

        if (matchedCommand) {
            if (matchedCommand.adminOnly) {
                if (message.guild && message.guild.id === ADMIN_SERVER_ID) {
                    return matchedCommand;
                }
                return;
            }
        }

        return matchedCommand;
    }

    public async handleMessage(message: Message): Promise<void> {
        const sentByBot = Boolean(message.author.bot);
        const sentInNewsChannel = message.channel.type === "news";

        if (sentByBot || sentInNewsChannel) {
            return;
        }

        const messagePrefix = this.getMessagePrefixUsed(message);

        if (messagePrefix) {
            const sendInGuild = Boolean(message.guild);

            let parsedMessage: CommandParser | GuildCommandParser;
            if (sendInGuild)
                parsedMessage = new GuildCommandParser(message, messagePrefix);
            else
                parsedMessage = new CommandParser(message, messagePrefix);

            const displayPrefix = this.getDisplayPrefixByMessage(message);

            if (!parsedMessage.commandName) {
                betterSend(parsedMessage.channel, `Yes? Try using \`${displayPrefix}commands\` to see a list of all my commands.`);
                return;
            }

            const matchedCommand = this.getCommand(parsedMessage.commandName, parsedMessage.originalMessage);

            if (!matchedCommand) {
                betterSend(parsedMessage.channel, `I don't recognize that command. Try \`${displayPrefix}help\`.`);
                return;
            }
            else {
                if (!parsedMessage.inGuild && matchedCommand.guildOnly) {
                    betterSend(parsedMessage.channel, "That command can only be used in servers.");
                    return;
                }

                if (matchedCommand.blocksInput) {
                    if (this.userIsLoadingCommand(message.author.id)) {
                        betterSend(parsedMessage.channel, "You're going too fast, one of your last commands hasn't even loaded yet!");
                        return;
                    }
                    this.setUserLoadingCommand(message.author.id);
                }

                let commandReceipt: CommandReceipt;
                try {
                    commandReceipt = await matchedCommand.parseAndRun(parsedMessage);
                }
                catch (error) {
                    errorHandler.handleError(error, "Command execution failed.");

                    betterSend(parsedMessage.channel, "Something went wrong while performing that command. Please report this to the developer.");
                    return;
                }
                finally {
                    this.unsetUserLoadingCommand(message.author.id);
                }

                if (commandReceipt.reactConfirm) {
                    parsedMessage.originalMessage.react("✅").catch(error => {
                        errorHandler.handleError(error, "There was an error attempting to react to a message after a command was completed.");
                    });
                }
            }
        }
    }

    private setUserLoadingCommand(userId: string): void {
        if (this.usersLoadingCommands.has(userId)) {
            throw new Error(stripIndents`
                A user who was already loading a command was added to the users loading commands list again.

                User id: ${userId}
            `);
        }

        this.usersLoadingCommands.add(userId);
    }

    private unsetUserLoadingCommand(userId: string): void {
        this.usersLoadingCommands.delete(userId);
    }

    private userIsLoadingCommand(userId: string): boolean {
        return this.usersLoadingCommands.has(userId);
    }

    public getPrefixByGuild(guild: Guild): string {
        let guildPrefix = this.guildPrefixes.get(guild.id);

        if (!guildPrefix) {
            guildPrefix = config.prefix;
        }

        return guildPrefix;
    }

    public getDisplayPrefixByMessage(message: Message): string {
        if (message.guild) {
            return this.getPrefixByGuild(message.guild);
        }
        return config.prefix;
    }

    private getMessagePrefixUsed(message: Message): string | undefined {
        const normalPrefix = this.getDisplayPrefixByMessage(message);

        if (message.content.startsWith(normalPrefix)) {
            return normalPrefix;
        }

        if (message.content.startsWith(this.botTag)) {
            return this.botTag;
        }

        return;
    }

    public async loadGuildPrefixes(): Promise<void> {
        let guildDocuments: Document[] | null;
        try {
            guildDocuments = await GuildModel.find({});
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error attempting to load guild prefixes from the database.
                
                ${error}
            `);
        }

        this.guildPrefixes.clear();
        for (const guildDocument of guildDocuments) {
            this.guildPrefixes.set(
                guildDocument.get(PlayerGuild.fieldNames.guildId),
                guildDocument.get(PlayerGuild.fieldNames.prefix)
            );
        }
    }

    public changeGuildPrefix(guildId: string, newPrefix: string): void {
        this.guildPrefixes.set(guildId, newPrefix);
    }
}
export const commandHandler = new CommandHandler();