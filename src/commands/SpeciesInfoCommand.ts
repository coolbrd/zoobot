import Command, { CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { betterSend } from "../discordUtility/messageMan";
import SpeciesInfoMessage from "../messages/SpeciesInfoMessage";
import { beastiary } from "../beastiary/Beastiary";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";

class SpeciesInfoCommand extends Command {
    public readonly commandNames = ["speciesinfo", "si"];

    public readonly info = "View a species' information and collectible cards";

    public readonly helpUseString = "`<species>` to view a species' traits and cards.";

    public readonly section = CommandSection.gettingStarted;

    public async run(parsedMessage: CommandParser, commandReceipt: CommandReceipt): Promise<CommandReceipt> {
        if (!parsedMessage.fullArguments) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const fullSearchTerm = parsedMessage.fullArguments.toLowerCase();

        let species: Species | undefined;
        try {
            species = await beastiary.species.searchSingleSpeciesByCommonNameAndHandleDisambiguation(fullSearchTerm, parsedMessage.channel);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a species by its common name in the species info command.

                Parsed message: ${JSON.stringify(parsedMessage)}
                
                ${error}
            `);
        }

        if (species === undefined) {
            return commandReceipt;
        }

        const infoMessage = new SpeciesInfoMessage(parsedMessage.channel, species);
        try {
            await infoMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a new species info message.

                Info message: ${infoMessage.debugString}
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new SpeciesInfoCommand();