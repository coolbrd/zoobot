import { TextChannel, User, APIMessage, MessageEmbed } from 'discord.js';

import InteractiveMessage from '../interactiveMessage/interactiveMessage';
import { capitalizeFirstLetter } from '../utility/arraysAndSuch';
import { getGuildMember } from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { client } from '..';
import { SpeciesObject } from '../models/species';
import InteractiveMessageHandler from '../interactiveMessage/interactiveMessageHandler';
import { createAnimal } from '../zoo/userManagement';
import { getGuildUserDisplayColor } from '../discordUtility/getGuildUserDisplayColor';
import { SmartEmbed } from '../discordUtility/smartEmbed';

// An interactive message that will represent an animal encounter
export default class EncounterMessage extends InteractiveMessage {
    // Override base channel field, because EncounterMessage can only be sent in TextChannels
    protected readonly channel: TextChannel;

    // The species of the animal contained within this encounter
    private readonly species: SpeciesObject;
    // The image chosen to be displayed for this animal encounter
    private imageIndex: number | undefined;

    constructor(handler: InteractiveMessageHandler, channel: TextChannel, species: SpeciesObject) {
        super(handler, channel, { buttons: {
                name: 'capture',
                emoji: '🔘',
                helpMessage: 'Capture'
            },
            deactivationText: '(fled)'
        });
        this.channel = channel;
        this.species = species;
    }

    public async build(): Promise<void> {
        super.build();

        // Load the species' information
        await this.species.load();

        try {
            this.setEmbed(await this.buildEmbed());
        }
        catch (error) {
            console.error('There was an error trying to build an encounter message\'s embed.');
            throw new Error(error);
        }
    }

    private async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();
        // Color the encounter's embed properly
        embed.setColor(getGuildUserDisplayColor(client.user, this.channel.guild));

        embed.setTitle(capitalizeFirstLetter(this.species.getCommonNames()[0]));

        embed.addField('――――――――', capitalizeFirstLetter(this.species.getScientificName()), true);

        // Pick a random image from the animal's set of images
        this.imageIndex = Math.floor(Math.random() * this.species.getImages().length);
        // Get the image of the determined index
        const image = this.species.getImages()[this.imageIndex];
        embed.setImage(image.getUrl());

        const breed = image.getBreed();
        // Add the breed field if it's there
        if (breed) {
            embed.addField('Breed', capitalizeFirstLetter(breed), true);
        }

        embed.setFooter('Wild encounter');
        return embed;
    }

    // Whenever the encounter's button is pressed
    public async buttonPress(_buttonName: string, user: User): Promise<void> {
        // Indicate that the user has caught the animal
        betterSend(this.getMessage().channel as TextChannel, `${user}, You caught ${this.species.getCommonNames()[0]}!`);
        this.setDeactivationText('(caught)');

        // Create the new animal
        await createAnimal(getGuildMember(user, this.channel.guild), this.species, { imageIndex: this.imageIndex as number });
        
        // Stop this message from receiving any more input
        this.deactivate();
    }
}