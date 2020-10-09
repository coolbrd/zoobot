import { TextChannel, User, MessageEmbed } from 'discord.js';

import InteractiveMessage from '../interactiveMessage/InteractiveMessage';
import { capitalizeFirstLetter } from '../utility/arraysAndSuch';
import getGuildMember from "../discordUtility/getGuildMember";
import { betterSend } from "../discordUtility/messageMan";
import { client } from '..';
import { Species } from '../models/Species';
import getGuildUserDisplayColor from '../discordUtility/getGuildUserDisplayColor';
import SmartEmbed from '../discordUtility/SmartEmbed';
import { errorHandler } from '../structures/ErrorHandler';
import { beastiary } from '../beastiary/Beastiary';

// An interactive message that will represent an animal encounter
export default class EncounterMessage extends InteractiveMessage {
    // Override base channel field, because EncounterMessage can only be sent in TextChannels
    protected readonly channel: TextChannel;

    // The species of the animal contained within this encounter
    private readonly species: Species;
    // The card chosen for this animal encounter
    private cardIndex: number | undefined;

    constructor(channel: TextChannel, species: Species) {
        super(channel, { buttons: {
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
            errorHandler.handleError(error, 'There was an error trying to build an encounter message\'s embed.');
        }
    }

    private async buildEmbed(): Promise<MessageEmbed> {
        const embed = new SmartEmbed();
        // Color the encounter's embed properly
        embed.setColor(getGuildUserDisplayColor(client.user, this.channel.guild));

        embed.setTitle(capitalizeFirstLetter(this.species.getCommonNames()[0]));

        embed.addField('――――――――', capitalizeFirstLetter(this.species.getScientificName()), true);

        // Pick a random card from the animal's set of card
        this.cardIndex = Math.floor(Math.random() * this.species.getCards().length);
        // Get the card of the determined index
        const card = this.species.getCards()[this.cardIndex];
        embed.setImage(card.getUrl());

        const breed = card.getBreed();
        // Add the breed field if it's there
        if (breed) {
            embed.addField('Breed', capitalizeFirstLetter(breed), true);
        }

        embed.setFooter('Wild encounter');
        return embed;
    }

    // Whenever the encounter's button is pressed
    public async buttonPress(_buttonName: string, user: User): Promise<void> {
        // Get the species' primary common name object
        const commonName = this.species.getCommonNameObjects()[0];

        // Indicate that the user has caught the animal
        betterSend(this.getMessage().channel as TextChannel, `${user}, you caught ${commonName.article} ${commonName.name}!`);
        this.setDeactivationText('(caught)');

        // Create the new animal
        try {
            await beastiary.animals.createAnimal(getGuildMember(user, this.channel.guild), this.species, this.cardIndex as number);
        }
        catch (error) {
            errorHandler.handleError(error, 'Thre was an error creating a new animal in an encounter message.');
            return;
        }

        // Stop this message from receiving any more input
        this.deactivate();
    }
}