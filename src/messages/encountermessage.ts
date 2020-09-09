import { TextChannel, User, APIMessage } from 'discord.js';

import { InteractiveMessage, InteractiveMessageHandler } from './interactiveMessage';
import { getGuildUserDisplayColor, capitalizeFirstLetter, betterSend } from '../utility/toolbox';
import { client } from '..';
import { SmartEmbed } from '../utility/smartEmbed';
import { Animal } from '../models/animal';
import { Document } from 'mongoose';

// An interactive message that will represent an animal encounter
// The primary way for users to collect new animals
export default class EncounterMessage extends InteractiveMessage {
    // The species of the animal contained within this encounter
    private readonly species: Document;
    private readonly imageIndex: number;

    constructor(handler: InteractiveMessageHandler, channel: TextChannel, species: Document) {
        const embed = new SmartEmbed();
        embed.setColor(getGuildUserDisplayColor(client.user, channel.guild));
        embed.setTitle(capitalizeFirstLetter(species.get('commonNames')[0]));
        embed.addField('――――――――', capitalizeFirstLetter(species.get('scientificName')), true);

        const imageIndex = Math.floor(Math.random() * species.get('images').length);
        const image = species.get('images')[imageIndex];
        embed.setImage(image.url);

        if (image.breed) {
            embed.addField('Breed', capitalizeFirstLetter(image.breed), true);
        }

        embed.setFooter('Wild encounter');

        const content = new APIMessage(channel, { embed: embed });

        super(handler, channel, {
            content: content,
            buttons: {
                name: 'capture',
                emoji: '🔘',
                helpMessage: 'Capture'
            },
            deactivationText: '(fled)'
        });
        this.species = species;
        this.imageIndex = imageIndex;
    }

    // Whenever the encounter's button is pressed
    public async buttonPress(_buttonName: string, user: User): Promise<void> {
        // Get this encounter's message
        const message = this.getMessage();

        // Indicate that the user has caught the animal
        betterSend(message.channel as TextChannel, `${user}, You caught ${this.species.get('commonNames')[0]}!`);
        this.setDeactivationText('(caught)');

        const animal = new Animal({
            species: this.species._id,
            owner: user.id,
            image: this.imageIndex,
            experience: 0
        });

        animal.save();
        
        // Stop this message from receiving any more input
        this.deactivate();
    }
}