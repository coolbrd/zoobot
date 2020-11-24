import { DMChannel, MessageEmbed, TextChannel, User } from "discord.js";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { Species } from "../structures/GameObject/GameObjects/Species";
import LoadableCacheableGameObject from '../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObjects/LoadableCacheableGameObject';
import { bulkLoad } from "../structures/GameObject/GameObjects/LoadableGameObject/LoadableGameObject";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import PagedMessage from './PagedMessage';
import { stripIndent } from "common-tags";
import BeastiaryClient from "../bot/BeastiaryClient";

export default class BeastiaryMessage extends PagedMessage<LoadableCacheableGameObject<Species>> {
    protected readonly lifetime = 60000;

    protected readonly elementsPerPage = 15;

    private readonly user: User;

    constructor(channel: TextChannel | DMChannel, beastiaryClient: BeastiaryClient, user: User) {
        super(channel, beastiaryClient);

        this.user = user;
    }

    private async buildLoadableSpeciesList(): Promise<void> {
        this.beastiaryClient.beastiary.species.allSpeciesIds.forEach(currentSpeciesId => {
            const loadableSpecies = new LoadableCacheableGameObject(currentSpeciesId, this.beastiaryClient.beastiary.species);
            this.elements.push(loadableSpecies);
        });
    }

    public async build(): Promise<void> {
        try {
            await this.buildLoadableSpeciesList();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error getting the ids of all species in a Beastiary message.
                
                ${error}
            `);
        }

        try {
            await super.build();
        }
        catch (error) {
            throw new Error(stripIndent`
                There was an error building the inherited information in a Beastiary message.
                
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
                There was an error loading all the species on the current page of a Beastiary message.

                Species on page: ${JSON.stringify(this.visibleElements)}
                
                ${error}
            `);
        }

        const embed = new SmartEmbed();

        embed.setAuthor(`${this.user.username}'s Beastiary`, this.user.avatarURL() || undefined);

        let pageString = "";
        this.visibleElements.forEach(loadableSpecies => {
            pageString += capitalizeFirstLetter(loadableSpecies.gameObject.commonNames[0]) + "\n";
        });

        embed.setDescription(pageString);

        embed.setFooter(`Page ${this.page + 1}/${this.pageCount}\n${this.getButtonHelpString()}`);

        return embed;
    }
}