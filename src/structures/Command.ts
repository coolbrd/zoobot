import CommandParser, { GuildCommandParser } from "./CommandParser";

export enum CommandSection {
    info,
    gettingStarted,
    playerInfo,
    animalManagement,
    guildManagement,
    getInvolved
}

// The template for all runnable commands
export default abstract class Command {
    // The list of all names that this command may be referred to as
    // The first entry is the command's primary name
    public abstract readonly commandNames: string[];

    // The text giving a brief description of what the command does
    public abstract readonly info: string;

    // Whether or not this command can only be used in guilds
    public readonly guildOnly?: boolean = false;

    // The section that a command falls under, used for command list message organization
    public readonly section?: CommandSection;

    // Whether or not another command may be run by the same user while this command is still executing
    public readonly blocksInput?: boolean = false;

    // Whether or not this command can only be used by admins
    public readonly adminOnly?: boolean = false;

    // Whether or not the bot should react to the user's original message once the command is completed
    public readonly reactConfirm?: boolean = false;

    // The command's usage documentation
    public abstract help(displayPrefix: string): string;

    // Execute the command
    public abstract run(parsedMessage: CommandParser): Promise<void>;
}

// A command that can only be run in a guild
export abstract class GuildCommand extends Command {
    // Indicate that these commands can only be run in guilds
    public readonly guildOnly = true;

    public abstract run(parsedMessage: GuildCommandParser): Promise<void>;
}