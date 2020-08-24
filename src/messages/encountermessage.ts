import { Message, MessageEmbed, TextChannel, User, APIMessage } from 'discord.js';

import { InteractiveMessage } from './interactiveMessage';
import { getGuildUserDisplayColor, capitalizeFirstLetter, betterSend } from '../utility/toolbox';
import { client } from '..';
import { SpeciesDocument } from '../models/species';

// An interactive message that will represent an animal encounter
// The primary way for users to collect new animals
export default class EncounterMessage extends InteractiveMessage {
    // The species of the animal contained within this encounter
    readonly species: SpeciesDocument;
    // Whether or not this animal has been caught
    caught: boolean;

    constructor(channel: TextChannel, species: SpeciesDocument) {
        const embed = new MessageEmbed();
        embed.setColor(getGuildUserDisplayColor(client.user as User, channel.guild) || 'DEFAULT');
        embed.setTitle(capitalizeFirstLetter(species.commonNames[0]));
        embed.setURL(species.wikiPage);
        embed.setDescription(capitalizeFirstLetter(species.scientificName));
        embed.setImage(species.images[Math.floor(Math.random() * species.images.length)]);
        embed.setFooter('Wild encounter');

        const content = new APIMessage(channel, { embed: embed });

        super(channel, { content: content, buttons: {
            name: 'capture',
            emoji: '🔘',
            helpMessage: 'Capture'
        }});
        this.species = species;
        this.caught = false;
    }

    // Whenever the encounter's button is pressed
    async buttonPress(_buttonName: string, user: User): Promise<void> {
        // Get this encounter's message, and assume it's not going to be undefined (because it really won't be)
        const message = this.getMessage() as Message;

        // Indicate that the user has caught the animal
        betterSend(message.channel, `${user}, You caught ${this.species.commonNames[0]}!`);
        this.caught = true;
        
        // Stop this message from receiving any more input
        this.deactivate();
    }

    async deactivate(): Promise<void> {
        // Inherit parent deactivation behavior
        super.deactivate();

        try {
            const message = this.getMessage() as Message;

            // Get the embed of the encounter message
            const embed = message.embeds[0];

            // Get the embed's footer
            const footer = embed.footer;

            // If for some reason there isn't a footer
            if (!footer) {
                throw new Error('Empty footer returned from encounter message.');
            }

            let newEmbed: MessageEmbed;
            // Edit the encounter's embed based on what happen to the animal
            if (this.caught) {
                newEmbed = embed.setFooter(`${footer.text} (caught)`);
            }
            else {
                newEmbed = embed.setFooter(`${footer.text} (fled)`);
            }
            // Update the message
            await message.edit(newEmbed);
        }
        catch (error) {
            console.error('Error trying to edit the footer of an encounter message.', error);
        }
    }
}