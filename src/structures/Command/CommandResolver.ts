import { ADMIN_SERVER_ID } from "../../config/secrets";
import Command from "./Command";
import CommandParser from "./CommandParser";

export default class CommandResolver {
    public readonly commandParser: CommandParser;
    public readonly command: Command | undefined;

    constructor(commandParser: CommandParser, baseCommandList: Command[]) {
        this.commandParser = commandParser;

        this.command = this.resolveCommand(baseCommandList);
    }

    private resolveCommand(baseCommandList: Command[]): Command | undefined {
        let currentCommandList = baseCommandList;
        let currentCommand = undefined;
        let foundSubCommand = false;
        do {
            if (this.commandParser.arguments.length === 0) {
                break;
            }

            const potentialCommandName = this.commandParser.arguments[0].text.toLowerCase();

            const matchingSubcommand = currentCommandList.find(currentCommand => {
                return currentCommand.names.includes(potentialCommandName);
            });

            if (matchingSubcommand) {
                foundSubCommand = true;
                currentCommand = matchingSubcommand;

                this.commandParser.consumeArgumentAsCommand();
                currentCommandList = currentCommand.subCommands;
            }
            else {
                foundSubCommand = false;
            }
        } while (foundSubCommand);

        if (currentCommand && currentCommand.adminOnly) {
            const parserGuild = this.commandParser.originalMessage.guild;

            if (parserGuild && parserGuild.id !== ADMIN_SERVER_ID) {
                return undefined;
            }
        }

        return currentCommand;
    }
}