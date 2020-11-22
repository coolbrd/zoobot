import { stripIndent } from "common-tags";
import { capitalizeFirstLetter } from "../../utility/arraysAndSuch";
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

export interface CommandArgumentInfo {
    name: string,
    optional?: boolean,
    info?: string,
    default?: string,
    continuous?: boolean
}

export default abstract class Command {
    public abstract readonly commandNames: string[];

    public abstract readonly info: string;

    public abstract readonly helpUseString: string;

    public readonly arguments: CommandArgumentInfo[] = [];

    public readonly subCommands: Command[] = [];

    public readonly section?: CommandSection;

    public readonly guildOnly?: boolean = false;

    public readonly blocksInput?: boolean = false;

    public readonly adminOnly?: boolean = false;

    public help(displayPrefix: string, commandChain: string[]): string {
        let helpString = `Use \`${displayPrefix}${commandChain.join(" ")}\` ${this.helpUseString}`;

        if (this.arguments.length > 0) {
            helpString += "\n\n__Arguments__\n";
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
            helpString += "\n\n__Options__\n";
            this.subCommands.forEach(currentSubCommand => {
                helpString += `\`${currentSubCommand.commandNames[0]}\`: ${currentSubCommand.info}\n`;
            });
        }

        return helpString;
    }

    public primaryName(): string {
        return this.commandNames[0];
    }

    protected async abstract run(parsedMessage: CommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt>;

    public async execute(parsedMessage: CommandParser): Promise<CommandReceipt> {
        const receipt = new CommandReceipt();

        try {
            return await this.run(parsedMessage, receipt);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error running a command.

                Command: ${JSON.stringify(this)}

                ${error}
            `);
        }
    }
}

export abstract class GuildCommand extends Command {
    public readonly guildOnly = true;

    protected abstract run(parsedMessage: GuildCommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt>;
}