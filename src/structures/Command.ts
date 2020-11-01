import CommandParser, { GuildCommandParser } from "./CommandParser";

export enum CommandSection {
    info,
    gettingStarted,
    playerInfo,
    animalManagement,
    guildManagement,
    getInvolved
}

export default abstract class Command {
    public abstract readonly commandNames: string[];

    public abstract readonly info: string;

    public abstract help(displayPrefix: string): string;

    public abstract run(parsedMessage: CommandParser): Promise<void> | Promise<boolean>;

    public readonly section?: CommandSection;

    public readonly guildOnly?: boolean = false;

    public readonly blocksInput?: boolean = false;

    public readonly adminOnly?: boolean = false;

    public readonly reactConfirm?: boolean = false;
}

export abstract class GuildCommand extends Command {
    public readonly guildOnly = true;

    public abstract run(parsedMessage: GuildCommandParser): Promise<void> | Promise<boolean>;
}