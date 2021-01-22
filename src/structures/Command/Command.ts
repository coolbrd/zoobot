import { stripIndent } from "common-tags";
import { BitFieldResolvable, PermissionString } from "discord.js";
import { inspect } from "util";
import BeastiaryClient from "../../bot/BeastiaryClient";
import { DEVELOPER_ID } from "../../config/secrets";
import { betterSend } from "../../discordUtility/messageMan";
import { capitalizeFirstLetter } from "../../utility/arraysAndSuch";
import CommandParser, { GuildCommandParser } from "./CommandParser";
import CommandReceipt from "./CommandReceipt";

export enum CommandSection {
    gettingStarted = "Getting started",
    gameplay = "Gameplay",
    info = "General info",
    animalManagement = "Animal management",
    guildManagement = "Guild management",
    getInvolved = "Get involved"
}

export interface CommandArgumentInfo {
    name: string,
    optional?: boolean,
    info?: string,
    default?: string,
    continuous?: boolean
}

export default abstract class Command {
    public abstract readonly names: string[];
    public abstract readonly info: string;
    public abstract readonly helpUseString: string;
    public readonly arguments: CommandArgumentInfo[] = [];
    public readonly subCommands: Command[] = [];
    public readonly sections?: CommandSection[];
    public readonly guildOnly?: boolean = false;
    public readonly blocksInput?: boolean = false;
    public readonly adminOnly?: boolean = false;

    public help(displayPrefix: string, commandChain: string[]): string {
        let helpString = `Use \`${displayPrefix}${commandChain.join(" ")}\` ${this.helpUseString}\n`;

        if (this.arguments.length > 0) {
            helpString += "\n__Arguments__\n";
            this.arguments.forEach(currentArgument => {
                let argumentString = `\`${currentArgument.name}\``;
                if (currentArgument.info) {
                    argumentString += `: ${capitalizeFirstLetter(currentArgument.info)}`;
                }
                if (currentArgument.optional) {
                    argumentString += " (optional)";
                }
                if (currentArgument.default) {
                    argumentString += ` (defaults to ${currentArgument.default})`;
                }
                if (currentArgument.continuous) {
                    argumentString += "\n`...`";
                }
                helpString += `${argumentString}\n`;
            });
        }

        if (this.subCommands.length > 0) {
            helpString += "\n__Options__\n";
            this.subCommands.forEach(currentSubCommand => {
                helpString += `\`${currentSubCommand.names[0]}\`: ${currentSubCommand.info}\n`;
            });
        }

        return helpString;
    }

    public get primaryName(): string {
        return this.names[0];
    }

    protected newReceipt(): CommandReceipt {
        const receipt: CommandReceipt = {
            reactConfirm: false
        };

        return receipt;
    }

    protected abstract run(parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt>;

    public async execute(parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        try {
            return await this.run(parsedMessage, beastiaryClient);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error running a command.

                Command: ${inspect(this)}

                ${error}
            `);
        }
    }
}

export abstract class GuildCommand extends Command {
    public readonly guildOnly = true;
    public readonly permissionRequirement?: BitFieldResolvable<PermissionString>;

    protected abstract run(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt>;

    public async execute(parsedMessage: GuildCommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        if (this.permissionRequirement) {
            if (!parsedMessage.member.hasPermission(this.permissionRequirement) && parsedMessage.sender.id !== DEVELOPER_ID) {
                betterSend(parsedMessage.channel, `You don't have adequate server permissions to run this command. Requirement: \`${this.permissionRequirement}\``);
                return this.newReceipt();
            }
        }

        try {
            return await super.execute(parsedMessage, beastiaryClient);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error running a guild command's inherited execution information.

                Command ${inspect(this)}

                ${error}
            `);
        }
    }
}