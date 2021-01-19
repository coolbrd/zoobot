import tips from "../beastiary/info/tips";
import BeastiaryClient from "../bot/BeastiaryClient";
import { betterSend } from "../discordUtility/messageMan";
import Command, { CommandArgumentInfo, CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import CommandReceipt from "../structures/Command/CommandReceipt";

class TipCommand extends Command {
    public readonly names = ["tip"];

    public readonly info = "Get a helpful tip about the game";

    public readonly helpUseString = "`<tip number>` to get a specific tip about the game. Specify no number to get a random one.";

    public readonly sections = [CommandSection.gettingStarted];

    public readonly arguments: CommandArgumentInfo[] = [
        {
            name: "tip number",
            info: "the tip number to display",
            default: "a random tip",
            optional: true
        }
    ];

    public async run(parsedMessage: CommandParser, _beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const receipt = this.newReceipt();

        let tipIndex: number;
        if (parsedMessage.currentArgument) {
            const numberArgument = Number(parsedMessage.consumeArgument().text) - 1;

            if (isNaN(numberArgument)) {
                betterSend(parsedMessage.channel, "Your specified tip number needs to be a number!");
                return receipt;
            }

            if (numberArgument < 0 || numberArgument > tips.length) {
                betterSend(parsedMessage.channel, `Your tip number is out of the range of valid tips! Try a number between 1 and ${tips.length}.`);
                return receipt;
            }

            tipIndex = numberArgument;
        }
        else {
            tipIndex = Math.floor(Math.random() * tips.length);
        }

        betterSend(parsedMessage.channel, `Tip ${tipIndex + 1}: ${tips[tipIndex]}`);

        return receipt;
    }
}
export default new TipCommand();