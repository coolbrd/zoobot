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
import CrewCommand from "../../commands/Crew/CrewCommand";
import SpeciesRarityCommand from '../../commands/SpeciesRarityCommand';
import SetEncounterChannelCommand from "../../commands/SetEncounterChannelCommand";
import { stripIndent } from "common-tags";
import CommandAliasesCommand from "../../commands/CommandAliasesCommand";
import FavoriteAnimalCommand from "../../commands/FavoriteAnimalCommand";
import ShopCommand from "../../commands/Shop/ShopCommand";
import ViewPepCommand from "../../commands/ViewPepCommand";
import CommandReceipt from "./CommandReceipt";
import CommandResolver from "./CommandResolver";
import SendPatreonLinkCommand from "../../commands/SendPatreonLinkCommand";
import GiveXpCommand from "../../commands/GiveXpCommand";
import ViewTokensCommand from "../../commands/ViewTokensCommand";
import SuppportServerInviteCommand from "../../commands/SuppportServerInviteCommand";
import FeedbackCommand from "../../commands/FeedbackCommand";
import DailyCurrencyCommand from "../../commands/DailyCurrencyCommand";
import GameInfoCommand from "../../commands/GameInfoCommand";
import BeastiaryClient from "../../bot/BeastiaryClient";
import FishCommand from "../../commands/FishCommand";

export default class CommandHandler {
    public readonly baseCommands = [
        HelpCommand,
        GameInfoCommand,
        EncounterCommand,
        BeastiaryCommand,
        ViewCollectionCommand,
        ViewPlayerProfileCommand,
        ChangeAnimalNicknameCommand,
        ViewPepCommand,
        DailyCurrencyCommand,
        ShopCommand,
        CrewCommand,
        FavoriteAnimalCommand,
        MoveAnimalsCommand,
        ReleaseAnimalCommand,
        GiveXpCommand,
        SetEncounterChannelCommand,
        ChangeGuildPrefixCommand,
        ViewResetsCommand,
        ViewTokensCommand,
        CommandAliasesCommand,
        SpeciesInfoCommand,
        AnimalInfoCommand,
        FishCommand,
        CommandListCommand,
        EditSpeciesCommand,
        SendPatreonLinkCommand,
        FeedbackCommand,
        SuppportServerInviteCommand,
        SubmitSpeciesCommand,
        ApprovePendingSpeciesCommand,
        SpeciesRarityCommand,
        ExitCommand
    ];
    private readonly usersLoadingCommands = new Set<string>();
    private readonly guildPrefixes: Map<string, string> = new Map();
    
    private readonly beastiaryClient: BeastiaryClient;

    constructor(beastiaryClient: BeastiaryClient) {
        this.beastiaryClient = beastiaryClient;
    }

    public get botTag(): string {
        return `<@!${(this.beastiaryClient.discordClient.user as User).id}>`;
    }

    public getCommandByParser(parsedMessage: CommandParser): Command | undefined {
        const resolver = new CommandResolver(parsedMessage, this.baseCommands);

        return resolver.command;
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
            if (sendInGuild) {
                parsedMessage = new GuildCommandParser(message, messagePrefix, this.beastiaryClient);
            }
            else {
                parsedMessage = new CommandParser(message, messagePrefix, this.beastiaryClient);
            }

            const displayPrefix = this.getDisplayPrefixByMessage(message);

            if (!parsedMessage.currentArgument) {
                betterSend(parsedMessage.channel, `Yes? Try using \`${displayPrefix}commands\` to see a list of all my commands.`);
                return;
            }

            const commandResolver = new CommandResolver(parsedMessage, this.baseCommands);

            if (!commandResolver.command) {
                betterSend(parsedMessage.channel, `I don't recognize that command. Try \`${displayPrefix}commands\`.`);
                return;
            }
            else {
                if (!parsedMessage.inGuild && commandResolver.command.guildOnly) {
                    betterSend(parsedMessage.channel, "That command can only be used in servers.");
                    return;
                }

                if (commandResolver.command.blocksInput) {
                    if (this.userIsLoadingCommand(message.author.id)) {
                        betterSend(parsedMessage.channel, "You're going too fast, one of your last commands hasn't even loaded yet!");
                        return;
                    }
                    this.setUserLoadingCommand(message.author.id);
                }

                let commandReceipt: CommandReceipt;
                try {
                    commandReceipt = await commandResolver.command.execute(commandResolver.commandParser, this.beastiaryClient);
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
            throw new Error(stripIndent`
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

        const messageContent = message.content.toLowerCase();

        if (messageContent.startsWith(normalPrefix)) {
            return normalPrefix;
        }

        if (messageContent.startsWith(this.botTag)) {
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
            throw new Error(stripIndent`
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