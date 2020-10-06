import { DMChannel, MessageEmbed, TextChannel, User } from 'discord.js';
import { Document } from 'mongoose';

import SmartEmbed from '../discordUtility/smartEmbed';
import InteractiveMessageHandler from '../interactiveMessage/interactiveMessageHandler';
import { Species, SpeciesObject } from '../models/species';
import { capitalizeFirstLetter } from '../utility/arraysAndSuch';
import PagedMessage from './pagedMessage';

enum BeastiaryViewMode {
    paged,
    info,
    image
}

export default class BeastiaryMessage extends PagedMessage<SpeciesObject> {
    private state = BeastiaryViewMode.paged;

    constructor(handler: InteractiveMessageHandler, channel: TextChannel | DMChannel) {
        super(handler, channel, 15);

        this.addButtons([
            {
                name: 'upArrow',
                emoji: '⬆️',
                helpMessage: 'Pointer up'
            },
            {
                name: 'downArrow',
                emoji: '⬇️',
                helpMessage: 'Pointer down'
            },
            {
                name: 'mode',
                emoji: 'Ⓜ️',
                helpMessage: 'View mode'
        }]);
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
            currentSpecies.loadImages();
            this.getElements().push(currentSpecies);
        });

        this.getElements().sort((a: SpeciesObject, b: SpeciesObject) => {
            return a.getCommonNames()[0].toUpperCase() > b.getCommonNames()[0].toUpperCase() ? 1 : -1;
        });

        this.setEmbed(this.buildEmbed());
    }
    
    private buildEmbed(): MessageEmbed {
        const embed = new SmartEmbed();

        embed.setTitle('Beastiary');

        embed.setFooter(this.getButtonHelpString());

        const selectedSpecies = this.getElements().selection();

        switch (this.state) {
            case BeastiaryViewMode.paged: {
                const images = selectedSpecies.getImages();

                embed.setThumbnail(images[Math.floor(Math.random() * images.length)].getUrl());

                let pageString = '';
                this.getVisibleElements().forEach(speciesObject => {
                    pageString += capitalizeFirstLetter(speciesObject.getCommonNames()[0]);
                    if (this.getElements().selection() === speciesObject) {
                        pageString += ' 🔹'
                    }
                    pageString += '\n'
                });

                embed.setDescription(pageString);
                break;
            }
        }

        return embed;
    }

    public buttonPress(buttonName: string, user: User): void {
        super.buttonPress(buttonName, user);

        switch (this.state) {
            case BeastiaryViewMode.paged: {
                switch (buttonName) {
                    case 'upArrow': {
                        this.movePointer(-1);
                        break;
                    }
                    case 'downArrow': {
                        this.movePointer(1);
                        break;
                    }
                }
                break;
            }
        }

        this.setEmbed(this.buildEmbed());
    }
}