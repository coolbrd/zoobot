import { MessageEmbed } from 'discord.js';
import { beastiary } from '../beastiary/Beastiary';
import { encounterHandler } from '../beastiary/EncounterHandler';
import SmartEmbed from '../discordUtility/SmartEmbed';
import { Species } from "../structures/GameObject/GameObjects/Species";
import LoadableCacheableGameObject from '../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObjects/LoadableCacheableGameObject';
import { bulkLoad } from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObject";
import { capitalizeFirstLetter } from '../utility/arraysAndSuch';
import PointedMessage from './PointedMessage';
import { stripIndent } from "common-tags";

export default class SpeciesRarityMessage extends PointedMessage<LoadableCacheableGameObject<Species>> {
    protected readonly lifetime = 60000;

    protected readonly elementsPerPage = 15;

    private async buildLoadableSpeciesList(): Promise<void> {
        beastiary.species.allSpeciesIds.forEach(currentSpeciesId => {
            const loadableSpecies = new LoadableCacheableGameObject(currentSpeciesId, beastiary.species);
            this.elements.push(loadableSpecies);
        });
    }

    public async build(): Promise<void> {
        try {
            await this.buildLoadableSpeciesList();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting the ids of all species in a rarity viewing message.
                
                ${error}
            `);
        }

        try {
            await super.build();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error building the inherited information in a rarity viewing message.
                
                ${error}
            `);
        }
    }

    protected async buildEmbed(): Promise<MessageEmbed> {
        try {
            await bulkLoad(this.visibleElements);
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error loading the species on the current page of a species rarity message.

                Species on page: ${JSON.stringify(this.visibleElements)}
                
                ${error}
            `);
        }

        const embed = new SmartEmbed();

        embed.setTitle("Rarity of all species");

        let pageString = "";
        this.visibleElements.forEach(currentLoadableSpecies => {
            const currentSpecies = currentLoadableSpecies.gameObject;

            const speciesMinimumOccurrence = encounterHandler.getWeightedRarityMinimumOccurrence(currentSpecies.rarity);

            pageString += `${capitalizeFirstLetter(currentSpecies.commonNames[0])}: **${(speciesMinimumOccurrence * 100).toPrecision(4)}%**\n`;
        });

        embed.setDescription(pageString);

        embed.setFooter(`Page ${this.page + 1}/${this.pageCount}\n${this.getButtonHelpString()}`);

        return embed;
    }
}