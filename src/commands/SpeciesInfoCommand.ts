import Command, { CommandSection } from "../structures/Command/Command";
import CommandParser from "../structures/Command/CommandParser";
import { Species } from "../structures/GameObject/GameObjects/Species";
import { betterSend } from "../discordUtility/messageMan";
import SpeciesInfoMessage from "../messages/SpeciesInfoMessage";
import { beastiary } from "../beastiary/Beastiary";
import SpeciesDisplayMessage from "../messages/SpeciesDisplayMessage";
import SpeciesDisambiguationMessage from "../messages/SpeciesDisambiguationMessage";
import { stripIndents } from "common-tags";

export default class SpeciesInfoCommand extends Command {
    public readonly commandNames = ["speciesinfo", "si"];

    public readonly info = "View a species' information and collectible cards";

    public readonly section = CommandSection.gettingStarted;

    public help(commandPrefix: string): string {
        return `Use \`${commandPrefix}${this.commandNames[0]}\` \`<species>\` to view a species' traits and cards.`;
    }

    public async run(parsedMessage: CommandParser): Promise<void> {
        if (!parsedMessage.fullArguments) {
            betterSend(parsedMessage.channel, this.help(parsedMessage.displayPrefix));
            return;
        }

        const fullSearchTerm = parsedMessage.fullArguments.toLowerCase();

        let species: Species | undefined;
        try {
            species = await beastiary.species.searchSingleSpeciesByCommonNameAndHandleDisambiguation(fullSearchTerm, parsedMessage.channel);
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error fetching a species by its common name in the species info command.

                Parsed message: ${JSON.stringify(parsedMessage)}
                
                ${error}
            `);
        }

        if (species === undefined) {
            return;
        }

        const infoMessage = new SpeciesInfoMessage(parsedMessage.channel, species);
        try {
            await infoMessage.send();
        }
        catch (error) {
            throw new Error(stripIndents`
                There was an error sending a new species info message.

                Info message: ${JSON.stringify(infoMessage)}
                
                ${error}
            `);
        }
    }
}