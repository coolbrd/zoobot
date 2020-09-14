import { TextChannel, User, APIMessage } from 'discord.js';

import InteractiveMessage from '../interactiveMessage/interactiveMessage';
import { getGuildUserDisplayColor, capitalizeFirstLetter, betterSend, getGuildMember } from '../utility/toolbox';
import { client } from '..';
import { SmartEmbed } from '../utility/smartEmbed';
import { SpeciesObject } from '../models/species';
import InteractiveMessageHandler from '../interactiveMessage/interactiveMessageHandler';
import { createAnimal } from '../zoo/userManagement';

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
        // Indicate that the user has caught the animal
        betterSend(this.getMessage().channel as TextChannel, `${user}, You caught ${this.species.commonNames[0]}!`);
        this.setDeactivationText('(caught)');

        // Create the new animal instance
        await createAnimal(getGuildMember(user, this.channel.guild), this.species, {imageIndex: this.imageIndex });
        
        // Stop this message from receiving any more input
        this.deactivate();
    }
}