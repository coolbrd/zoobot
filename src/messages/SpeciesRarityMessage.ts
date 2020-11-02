import { MessageEmbed } from 'discord.js';
import { beastiary } from '../beastiary/Beastiary';
import { encounterHandler } from '../beastiary/EncounterHandler';
import SmartEmbed from '../discordUtility/SmartEmbed';
import { Species } from '../models/Species';
import LoadableGameObject, { bulkLoad } from '../structures/LoadableGameObject';
import { capitalizeFirstLetter } from '../utility/arraysAndSuch';
import PointedMessage from './PointedMessage';

export default class SpeciesRarityMessage extends PointedMessage<LoadableGameObject<Species>> {
    protected readonly lifetime = 60000;

    protected readonly elementsPerPage = 15;

    private async buildLoadableSpeciesList(): Promise<void> {
        beastiary.species.allSpeciesIds.forEach(currentSpeciesId => {
            const loadableSpecies = new LoadableGameObject(currentSpeciesId, beastiary.species);
            this.elements.push(loadableSpecies);
        });
    }

    public async build(): Promise<void> {
        try {
            await this.buildLoadableSpeciesList();
        }
        catch (error) {
            throw new Error(`There was an error getting the ids of all species in a rarity viewing message: ${error}`);
        }

        try {
            await super.build();
        }
        catch (error) {
            throw new Error(`There was an error building the inherited information in a rarity viewing message: ${error}`);
        }
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        try {
            await bulkLoad(this.visibleElements);
        }
        catch (error) {
            throw new Error(`There was an error loading the species on the current page of a species rarity message: ${error}`);
        }

        const embed = new SmartEmbed();

        embed.setTitle("Rarity of all species");

        const totalRarityWeight = encounterHandler.getTotalRarityWeight();

        let pageString = "";
        this.visibleElements.forEach(currentLoadableSpecies => {
            const currentSpecies = currentLoadableSpecies.gameObject;

            const speciesRarity = ((currentSpecies.rarity / totalRarityWeight) * 100).toPrecision(2);

            pageString += `${capitalizeFirstLetter(currentSpecies.commonNames[0])}: ${speciesRarity}%\n`;
        });

        embed.setDescription(pageString);

        embed.setFooter(`Page ${this.page + 1}/${this.pageCount}\n${this.getButtonHelpString()}`);

        return embed;
    }
}