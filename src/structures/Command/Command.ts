import { stripIndents } from "common-tags";
import CommandParser, { GuildCommandParser } from "./CommandParser";
import CommandReceipt from "./CommandReceipt";

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

    public readonly subCommands: Command[] = [];

    public readonly section?: CommandSection;

    public readonly guildOnly?: boolean = false;

    public readonly blocksInput?: boolean = false;

    public readonly adminOnly?: boolean = false;

    public abstract help(displayPrefix: string): string;

    protected async abstract run(parsedMessage: CommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt>;

    private findMatchingSubCommand(commandName: string): Command | undefined {
        return this.subCommands.find(currentSubCommand => {
            const matchesCommandName = currentSubCommand.commandNames.includes(commandName);

            return matchesCommandName;
        });
    }

    public async parseAndRun(parsedMessage: CommandParser): Promise<CommandReceipt> {
        if (parsedMessage.arguments.length > 0) {
            const potentialSubCommandName = parsedMessage.arguments[0].text.toLowerCase();

            const matchingSubCommand = this.findMatchingSubCommand(potentialSubCommandName);

            if (matchingSubCommand) {
                parsedMessage.shiftSubCommand();

                try {
                    return await matchingSubCommand.parseAndRun(parsedMessage);
                }
                catch (error) {
                    throw new Error(stripIndents`
                        There was an error parsing and running a parsed message within a subcommand of a command.

                        Command: ${JSON.stringify(this)}
                        Subcommand: ${JSON.stringify(matchingSubCommand)}
                    `);
                }
            }
        }

        try {
            return await this.run(parsedMessage, new CommandReceipt());
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error running a command.

                Command: ${JSON.stringify(this)}
                Parsed message: ${JSON.stringify(parsedMessage)}
            `);
        }
    }
}

export abstract class GuildCommand extends Command {
    public readonly guildOnly = true;

    protected abstract run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt>;
}