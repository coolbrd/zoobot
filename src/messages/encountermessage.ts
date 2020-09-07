import { TextChannel, User, APIMessage, DMChannel } from 'discord.js';

import { InteractiveMessage } from './interactiveMessage';
import { getGuildUserDisplayColor, capitalizeFirstLetter, betterSend } from '../utility/toolbox';
import { client } from '..';
import { SpeciesObject } from '../models/species';
import { SmartEmbed } from '../utility/smartEmbed';

// An interactive message that will represent an animal encounter
// The primary way for users to collect new animals
export default class EncounterMessage extends InteractiveMessage {
    // The species of the animal contained within this encounter
    private readonly species: SpeciesObject;

    constructor(channel: TextChannel, species: SpeciesObject) {
        const embed = new SmartEmbed();
        embed.setColor(getGuildUserDisplayColor(client.user, channel.guild));
        embed.setTitle(capitalizeFirstLetter(species.commonNames[0]));
        embed.addField('――――――――', capitalizeFirstLetter(species.scientificName), true);

        const image = species.images[Math.floor(Math.random() * species.images.length)];
        embed.setImage(image.url);

        if (image.breed) {
            embed.addField('Breed', capitalizeFirstLetter(image.breed), true);
        }

        embed.setFooter('Wild encounter');

        const content = new APIMessage(channel, { embed: embed });

        super(channel, {
            content: content,
            buttons: {
                name: 'capture',
                emoji: '🔘',
                helpMessage: 'Capture'
            },
            deactivationText: '(fled)'
        });
        this.species = species;
    }

    // Whenever the encounter's button is pressed
    public async buttonPress(_buttonName: string, user: User): Promise<void> {
        // Get this encounter's message
        const message = this.getMessage();

        // Indicate that the user has caught the animal
        betterSend(message.channel as TextChannel | DMChannel, `${user}, You caught ${this.species.commonNames[0]}!`);
        this.setDeactivationText('caught');
        
        // Stop this message from receiving any more input
        this.deactivate();
    }
}