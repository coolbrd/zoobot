import Command, { CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { betterSend } from "../discordUtility/messageMan";
import SpeciesInfoMessage from "../messages/SpeciesInfoMessage";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Player } from "../structures/GameObject/GameObjects/Player";
import getGuildMember from "../discordUtility/getGuildMember";
import BeastiaryClient from "../bot/BeastiaryClient";

class SpeciesInfoCommand extends Command {
    public readonly commandNames = ["speciesinfo", "si"];

    public readonly info = "View a species' information and collectible cards";

    public readonly helpUseString = "`<species>` to view a species' traits and cards.";

    public readonly section = CommandSection.info;

    public async run(parsedMessage: CommandParser, commandReceipt: CommandReceipt, beastiaryClient: BeastiaryClient): Promise<CommandReceipt> {
        if (!parsedMessage.fullArguments) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix, parsedMessage.commandChain));
            return commandReceipt;
        }

        const fullSearchTerm = parsedMessage.fullArguments.toLowerCase();

        let species: Species | undefined;
        try {
            species = await beastiaryClient.beastiary.species.searchSingleSpeciesByCommonNameAndHandleDisambiguation(fullSearchTerm, parsedMessage.channel);
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

        let player: Player | undefined;
        if (parsedMessage.guild) {
            const guildMember = getGuildMember(parsedMessage.sender.id, parsedMessage.guild.id, beastiaryClient);
            
            player = await beastiaryClient.beastiary.players.safeFetch(guildMember);
        }

        const infoMessage = new SpeciesInfoMessage(parsedMessage.channel, beastiaryClient, species, player);
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