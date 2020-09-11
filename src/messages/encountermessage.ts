import { TextChannel, User, APIMessage } from 'discord.js';

import InteractiveMessage from '../interactiveMessage/interactiveMessage';
import { getGuildUserDisplayColor, capitalizeFirstLetter, betterSend } from '../utility/toolbox';
import { client } from '..';
import { SmartEmbed } from '../utility/smartEmbed';
import { Animal } from '../models/animal';
import { SpeciesObject } from '../models/species';
import InteractiveMessageHandler from '../interactiveMessage/interactiveMessageHandler';

// An interactive message that will represent an animal encounter
export default class EncounterMessage extends InteractiveMessage {
    // Override base channel field, because EncounterMessage can only be sent in TextChannels
    protected readonly channel: TextChannel;

    // The species of the animal contained within this encounter
    private readonly species: SpeciesObject;
    // The image chosen to be displayed for this animal encounter
    private readonly imageIndex: number;

    constructor(handler: InteractiveMessageHandler, channel: TextChannel, species: SpeciesObject) {
        const embed = new SmartEmbed();
        // Color the encounter's embed properly
        embed.setColor(getGuildUserDisplayColor(client.user, channel.guild));

        embed.setTitle(capitalizeFirstLetter(species.commonNames[0]));

        embed.addField('――――――――', capitalizeFirstLetter(species.scientificName), true);

        // Pick a random image from the animal's set of images
        const imageIndex = Math.floor(Math.random() * species.images.length);
        // Get the image of the determined index
        const image = species.images[imageIndex];
        embed.setImage(image.url);

        // Add the breed field if it's there
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
        this.channel = channel;
        this.species = species;
        this.imageIndex = imageIndex;
    }

    // Whenever the encounter's button is pressed
    public async buttonPress(_buttonName: string, user: User): Promise<void> {
        // Get this encounter's message
        const message = this.getMessage();

        // Indicate that the user has caught the animal
        betterSend(message.channel as TextChannel, `${user}, You caught ${this.species.commonNames[0]}!`);
        this.setDeactivationText('(caught)');

        const animal = new Animal({
            species: this.species._id,
            owner: user.id,
            server: this.channel.guild.id,
            image: this.species.images[this.imageIndex]._id,
            experience: 0
        });

        animal.save();
        
        // Stop this message from receiving any more input
        this.deactivate();
    }
}