import Command, { CommandSection } from "../structures/Command/Command";
import CommandParser, { GuildCommandParser } from "../structures/Command/CommandParser";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { betterSend } from "../discordUtility/messageMan";
import SpeciesInfoMessage from "../messages/SpeciesInfoMessage";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Player } from "../structures/GameObject/GameObjects/Player";
import BeastiaryClient from "../bot/BeastiaryClient";
import { inspect } from "util";

class SpeciesInfoCommand extends Command {
    public readonly names = ["speciesinfo", "si"];

    public readonly info = "View a species' information and collectible cards";

    public readonly helpUseString = "`<species>` to view a species' traits and cards.";

    public readonly sections = [CommandSection.info];

    public async run(parsedMessage: CommandParser, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        const commandReceipt = this.newReceipt();
        
        if (!parsedMessage.restOfText) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const fullSearchTerm = parsedMessage.restOfText.toLowerCase();

        let species: Species | undefined;
        try {
            species = await beastiaryClient.beastiary.species.searchSingleSpeciesByCommonNameAndHandleDisambiguation(fullSearchTerm, parsedMessage.channel);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error fetching a species by its common name in the species info command.

                Parsed message: ${inspect(parsedMessage)}
                
                ${error}
            `);
        }

        if (species === undefined) {
            return commandReceipt;
        }

        let player: Player | undefined;
        if (parsedMessage.guild) {
            const guildParser = parsedMessage as GuildCommandParser;

            player = await beastiaryClient.beastiary.players.safeFetch(guildParser.member);
        }

        const infoMessage = new SpeciesInfoMessage(parsedMessage.channel, beastiaryClient, species, player);
        try {
            await infoMessage.send();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error sending a new species info message.
                
                ${error}
            `);
        }

        return commandReceipt;
    }
}
export default new SpeciesInfoCommand();