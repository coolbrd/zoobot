import { MessageEmbed } from 'discord.js';
import { encounterHandler } from '../beastiary/EncounterHandler';
import SmartEmbed from '../discordUtility/SmartEmbed';
import { Species } from '../models/Species';
import { capitalizeFirstLetter } from '../utility/arraysAndSuch';
import AllSpeciesMessage from './AllSpeciesMessage';

export default class SpeciesRarityMessage extends AllSpeciesMessage {
    protected readonly lifetime = 60000;

    protected readonly elementsPerPage = 15;

    protected async buildEmbed(): Promise<MessageEmbed> {
        try {
            await this.loadSpeciesOnPage();
        }
        catch (error) {
            throw new Error(`There was an error loading the species on the current page of a species rarity message: ${error}`);
        }

        const embed = new SmartEmbed()

        embed.setTitle("Rarity of all species");

        const totalRarityWeight = encounterHandler.getTotalRarityWeight();

        let pageString = "";
        this.visibleElements.forEach(currentLoadableSpecies => {
            const currentSpecies = currentLoadableSpecies.species as Species;

            const speciesRarity = ((currentSpecies.rarity / totalRarityWeight) * 100).toPrecision(2);

            pageString += `${capitalizeFirstLetter(currentSpecies.commonNames[0])}: ${speciesRarity}%\n`;
        });

        embed.setDescription(pageString);

        embed.setFooter(`Page ${this.page + 1}/${this.pageCount}\n${this.getButtonHelpString()}`);

        return embed;
    }
}