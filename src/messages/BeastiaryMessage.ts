import { DMChannel, MessageEmbed, TextChannel, User } from "discord.js";
import { beastiary } from '../beastiary/Beastiary';
import SmartEmbed from "../discordUtility/SmartEmbed";
import { Species } from '../models/Species';
import LoadableCacheableGameObject from '../structures/LoadableGameObject/LoadableGameObjects/LoadableCacheableGameObject';
import { bulkLoad } from "../structures/LoadableGameObject/LoadableGameObject";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import PagedMessage from './PagedMessage';

export default class BeastiaryMessage extends PagedMessage<LoadableCacheableGameObject<Species>> {
    protected readonly lifetime = 60000;

    protected readonly elementsPerPage = 15;

    private readonly user: User;

    constructor(channel: TextChannel | DMChannel, user: User) {
        super(channel);

        this.user = user;
    }

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
            throw new Error(`There was an error getting the ids of all species in a Beastiary message: ${error}`);
        }

        try {
            await super.build();
        }
        catch (error) {
            throw new Error(`There was an error building the inherited information in a Beastiary message: ${error}`);
        }
    }
    
    protected async buildEmbed(): Promise<MessageEmbed> {
        try {
            await bulkLoad(this.visibleElements);
        }
        catch (error) {
            throw new Error(`There was an error loading all the species on the current page of a Beastiary message: ${error}`);
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