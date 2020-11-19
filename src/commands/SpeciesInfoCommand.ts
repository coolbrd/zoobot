import Command, { CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { betterSend } from "../discordUtility/messageMan";
import SpeciesInfoMessage from "../messages/SpeciesInfoMessage";
import { beastiary } from "../beastiary/Beastiary";
import { stripIndent } from "common-tags";
import CommandReceipt from "../structures/Command/CommandReceipt";
import { Player } from "../structures/GameObject/GameObjects/Player";
import getGuildMember from "../discordUtility/getGuildMember";

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

        let player: Player | undefined;
        if (parsedMessage.guild) {
            const guildMember = getGuildMember(parsedMessage.sender.id, parsedMessage.guild.id);
            try {
                player = await beastiary.players.fetch(guildMember);
            }
            catch (error) {
                throw new Error(stripIndent`
                    There was an error fetching a player by a guild member in the species info command.

                    Guild member: ${JSON.stringify(guildMember)}

                    ${error}
                `);
            }
        }

        const infoMessage = new SpeciesInfoMessage(parsedMessage.channel, species, player);
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