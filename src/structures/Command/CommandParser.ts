import { stripIndent } from "common-tags";
import { Message, TextChannel, DMChannel, User, GuildMember, Guild } from "discord.js";
import BeastiaryClient from "../../bot/BeastiaryClient";
import getGuildMember from '../../discordUtility/getGuildMember';

export interface Argument {
    text: string,
    userId?: string,
    user?: User,
    member?: GuildMember
}

export default class CommandParser {
    protected readonly beastiaryClient: BeastiaryClient;

    public readonly commandPrefix: string;
    public readonly displayPrefix: string;

    public readonly commandChain: string[] = [];
    public readonly arguments: Argument[] = [];

    public readonly originalMessage: Message;
    public readonly channel: TextChannel | DMChannel;
    public readonly sender: User;

    public readonly inGuild: boolean;
    public readonly guild?: Guild;

    constructor(message: Message, prefixUsed: string, beastiaryClient: BeastiaryClient) {
        this.beastiaryClient = beastiaryClient;

        this.inGuild = Boolean(message.guild);
        this.guild = message.guild || undefined;

        this.commandPrefix = prefixUsed;
        this.displayPrefix = beastiaryClient.commandHandler.getDisplayPrefixByMessage(message);
        
        const messageWithoutPrefix = message.content.slice(prefixUsed.length).trim();

        const splitByQuotes = messageWithoutPrefix.split("\"");

        let splitMessage: string[] = [];
        for (let i = 0; i < splitByQuotes.length; i += 2) {
            splitMessage.push(...splitByQuotes[i].trim().split(" "));

            if (i + 1 < splitByQuotes.length) {
                splitMessage.push(splitByQuotes[i + 1]);
            }
        }

        splitMessage = splitMessage.filter(element => {
            return element;
        });

        for (const argument of splitMessage) {
            let userId: string | undefined;
            if (argument.length >= 18) {
                const tagPosition = argument.search(/<@!.*>/);

                if (tagPosition !== -1) {
                    userId = argument.slice(tagPosition + 3, tagPosition + 3 + 18);
                }
                else {
                    userId = argument;
                }
            }

            this.arguments.push({
                text: argument,
                userId: userId
            });
        }
    
        this.originalMessage = message;
        this.channel = message.channel as TextChannel | DMChannel;
        this.sender = message.author;
    }

    public async init(): Promise<void> {
        const returnPromises: Promise<unknown>[] = [];

        for (const argument of this.arguments) {
            if (!argument.userId) {
                continue;
            }

            const loadPromise = this.beastiaryClient.discordClient.users.fetch(argument.userId).then(user => {
                argument.user = user;
            });

            returnPromises.push(loadPromise);
        }

        await Promise.all(returnPromises);
    }

    public get currentArgument(): Argument | undefined {
        if (this.arguments[0]) {
            return this.arguments[0];
        }
        else {
            return undefined;
        }
    }

    public get fullArguments(): string {
        let fullArguments = "";

        let argumentIndex = 0;
        this.arguments.forEach(currentArgument => {
            fullArguments += currentArgument.text;

            if (argumentIndex < this.arguments.length - 1) {
                fullArguments += " ";
            }

            argumentIndex += 1;
        });

        return fullArguments;
    }

    public consumeArgument(): Argument {
        const shiftedArgument = this.arguments.shift();

        if (!shiftedArgument) {
            throw new Error(stripIndent`
                A command parser with no arguments left was told to consume an argument.

                Parser: ${JSON.stringify(this)}
            `);
        }

        return shiftedArgument;
    }

    public shiftSubCommand(): void {
        const subCommandArgument = this.consumeArgument();

        this.commandChain.push(subCommandArgument.text.toLowerCase());
    }
}

export class GuildCommandParser extends CommandParser {
    public readonly inGuild = true;

    public readonly channel: TextChannel;
    public readonly guild: Guild;

    private _member: GuildMember | undefined;

    constructor(message: Message, prefixUsed: string, beastiaryClient: BeastiaryClient) {
        super(message, prefixUsed, beastiaryClient);

        if (message.channel.type !== "text") {
            throw new Error(stripIndent`
                A message within a non-text channel was given to a guild command parser.

                Message: ${JSON.stringify(message)}
            `);
        }

        this.channel = message.channel;
        this.guild = this.channel.guild;
    }

    public get member(): GuildMember {
        if (!this._member) {
            throw new Error(stripIndent`
                A guild command parser's member field was attempted to be accessed before it was loaded.

                Parser: ${JSON.stringify(this)}
            `);
        }

        return this._member;
    }

    public async init(): Promise<void> {
        const returnPromises: Promise<unknown>[] = [];
        returnPromises.push(super.init())

        const loadMemberPromise = this.guild.members.fetch(this.sender.id).then(member => {
            this._member = member;
        });
        returnPromises.push(loadMemberPromise);

        for (const argument of this.arguments) {
            if (!argument.userId) {
                continue;
            }

            const getGuildMemberPromise = getGuildMember(argument.userId, this.guild.id, this.beastiaryClient).then(guildMember => {
                argument.member = guildMember;
            });

            returnPromises.push(getGuildMemberPromise);
        }

        await Promise.all(returnPromises);
    }
}