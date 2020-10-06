import { DMChannel, MessageEmbed, TextChannel, User } from 'discord.js';
import { Document } from 'mongoose';

import SmartEmbed from '../discordUtility/smartEmbed';
import { Species, SpeciesObject } from '../models/species';
import { capitalizeFirstLetter } from '../utility/arraysAndSuch';
import PagedMessage from './pagedMessage';

export default class BeastiaryMessage extends PagedMessage<SpeciesObject> {
    private readonly user: User;

    constructor(channel: TextChannel | DMChannel, user: User) {
        super(channel, 10);

        this.user = user;
    }

    public async build(): Promise<void> {
        let speciesDocuments: Document[];
        try {
            speciesDocuments = await Species.find({});
        }
        catch (error) {
            throw new Error('There was an error getting a list of all species from the database.');
        }

        speciesDocuments.forEach(speciesDocument => {
            const currentSpecies = new SpeciesObject({ document: speciesDocument });
            this.getElements().push(currentSpecies);
        });

        this.getElements().sort((a: SpeciesObject, b: SpeciesObject) => {
            return a.getCommonNames()[0].toUpperCase() > b.getCommonNames()[0].toUpperCase() ? 1 : -1;
        });

        this.setEmbed(this.buildEmbed());
    }
    
    private buildEmbed(): MessageEmbed {
        const embed = new SmartEmbed();

        embed.setAuthor(`${this.user.username}'s Beastiary`, this.user.avatarURL() || undefined);

        let pageString = '';
        this.getVisibleElements().forEach(speciesObject => {
            pageString += capitalizeFirstLetter(speciesObject.getCommonNames()[0]) + '\n';
        });

        embed.setDescription(pageString);

        embed.setFooter(this.getButtonHelpString());

        return embed;
    }

    public buttonPress(buttonName: string, user: User): void {
        super.buttonPress(buttonName, user);

        switch (buttonName) {
            case 'leftArrow': {
                this.movePages(-1);
                break;
            }
            case 'rightArrow': {
                this.movePages(1);
                break;
            }
        }

        this.setEmbed(this.buildEmbed());
    }
}