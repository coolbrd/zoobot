import { stripIndent } from "common-tags";
import { Message, TextChannel, DMChannel, User, GuildMember, Guild } from "discord.js";
import BeastiaryClient from "../../bot/BeastiaryClient";
import getGuildMember from "../../discordUtility/getGuildMember";

export interface Argument {
    text: string,
    user?: User,
    member?: GuildMember
}

export default class CommandParser {
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
            let user: User | undefined;
            if (argument.length >= 18) {
                let userId: string;
                const tagPosition = argument.search(/<@!.*>/);

                if (tagPosition !== -1) {
                    userId = argument.slice(tagPosition + 3, tagPosition + 3 + 18);
                }
                else {
                    userId = argument;
                }

                user = beastiaryClient.discordClient.users.resolve(userId) || undefined;
            }

            this.arguments.push({
                text: argument,
                user: user
            });
        }
    
        this.originalMessage = message;
        this.channel = message.channel as TextChannel | DMChannel;
        this.sender = message.author;
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

    public shiftSubCommand(): void {
        const subCommandArgument = this.arguments.shift();

        if (!subCommandArgument) {
            throw new Error(stripIndent`
                A command parser with no arguments was shifted as if it triggered a subcommand.

                Parser: ${JSON.stringify(this)}
            `);
        }

        this.commandChain.push(subCommandArgument.text.toLowerCase());
    }
}

export class GuildCommandParser extends CommandParser {
    public readonly inGuild = true;

    public readonly channel: TextChannel;
    public readonly guild: Guild;

    public readonly member: GuildMember;

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

        this.member = getGuildMember(this.sender, this.guild, beastiaryClient);

        this.arguments.forEach(argument => {
            if (argument.user) {
                argument.member = this.channel.guild.member(argument.user) || undefined;
            }
        });
    }
}