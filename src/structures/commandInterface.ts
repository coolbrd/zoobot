import CommandParser from './commandParser';

// The template for all runnable commands
export default interface Command {
    // The list of all names that this command may be referred to as
    // The first entry is the command's primary name
    readonly commandNames: string[];

    // Whether or not this command can only be used by admins
    readonly adminOnly?: boolean;

    // The command's usage documentation
    help(commandPrefix: string): string;

    // Execute the command
    run(parsedUserCommand: CommandParser): Promise<void>;
}