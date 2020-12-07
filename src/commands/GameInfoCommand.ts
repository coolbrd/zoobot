import { stripIndents } from "common-tags";
import mechanics from "../beastiary/info/GameMechanics";
import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import Command, { CommandArgumentInfo, CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class GameInfoCommand extends Command {
    public readonly commandNames = ["gameinfo", "gi", "info"];

    public readonly info = "Get more information about how the game works";

    public readonly helpUseString = "`mechanic` to view more information about that mechanic.";

    public readonly section = CommandSection.gettingStarted;

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "game mechanic",
            info: "the game mechanic you want more information about",
            optional: false
        }
    ];

    public async run(parsedMessage: CommandParser, commandReceipt: CommandReceipt, _beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        if (!parsedMessage.currentArgument) {
            const gameMechanicNames: string[] = [];
            mechanics.forEach(mechanic => {
                gameMechanicNames.push(`\`${mechanic.names[0]}\``);
            });

            betterSend(parsedMessage.channel, stripIndents`
                Here's a list of all the game mechanics you can learn about in this command:
                ${gameMechanicNames.join(", ")}

                ${this.help(parsedMessage.displayPrefix, parsedMessage.commandChain)}
            `);
            return commandReceipt;
        }

        const searchTerm = parsedMessage.restOfText.trim().toLowerCase();

        const matchedGameMechanic = mechanics.find(mechanic => {
            return mechanic.names.includes(searchTerm);
        });

        if (!matchedGameMechanic) {
            betterSend(parsedMessage.channel, `No game mechanic by the name '${searchTerm}' exists.`);
            return commandReceipt;
        }

        betterSend(parsedMessage.channel, matchedGameMechanic.info);
        return commandReceipt;
    }
}
export default new GameInfoCommand();