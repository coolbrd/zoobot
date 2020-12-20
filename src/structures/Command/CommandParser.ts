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

    public restOfText: string;

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
        
        const contentWithoutPrefix = message.content.replace(prefixUsed, "").trim();
        this.restOfText = contentWithoutPrefix.trim();

        const splitByQuotes = contentWithoutPrefix.split("\"");

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
                else if (argument.length === 18 && !isNaN(Number(argument))) {
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
            }).catch(error => {
                throw new Error(stripIndent`
                    There was an error fetching a user from the Discord client while initializing a command parser.

                    User id: ${argument.userId}

                    ${error}
                `);
            });

            returnPromises.push(loadPromise);
        }

        await Promise.all(returnPromises);
    }

    public get currentArgument(): Argument | undefined {
        if (this.arguments.length > 0) {
            return this.arguments[0];
        }
        else {
            return undefined;
        }
    }

    private removeFromRestOfText(text: string): void {
        this.restOfText = this.restOfText.replace(text, "").trim();
    }

    public consumeArgument(): Argument {
        const consumedArgument = this.arguments.shift();

        if (!consumedArgument) {
            throw new Error(stripIndent`
                A command parser with no arguments left was told to consume an argument.

                Parser: ${JSON.stringify(this)}
            `);
        }

        this.removeFromRestOfText(consumedArgument.text);

        return consumedArgument;
    }

    public consumeArgumentAsCommand(): void {
        const subCommandArgument = this.consumeArgument();

        this.commandChain.push(subCommandArgument.text.toLowerCase().trim());
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

    private async loadMember(): Promise<void> {
        try {
            this._member = await this.guild.members.fetch(this.sender.id)
        }
        catch (error) {
            throw new Error(stripIndent`
                A guild command parser couldn't fetch its sender's member.

                Sender id: ${this.sender.id}

                ${error}
            `);
        }
    }

    public async init(): Promise<void> {
        const returnPromises: Promise<unknown>[] = [];
        returnPromises.push(super.init())

        returnPromises.push(this.loadMember());

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