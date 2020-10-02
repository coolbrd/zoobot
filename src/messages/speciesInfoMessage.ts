import { DMChannel, TextChannel, MessageEmbed, User } from "discord.js";

import InteractiveMessage from "../interactiveMessage/interactiveMessage";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import { client } from "..";
import { SpeciesObject } from "../models/species";
import InteractiveMessageHandler from "../interactiveMessage/interactiveMessageHandler";
import getGuildUserDisplayColor from "../discordUtility/getGuildUserDisplayColor";
import SmartEmbed from "../discordUtility/smartEmbed";

export default class SpeciesInfoMessage extends InteractiveMessage {
    private readonly species: SpeciesObject;
    // The current image of the species that's being displayed by the info message
    private currentImage = 0;
    // Whether the info message is displaying a large image, or the species' details
    private pictureMode = true;

    constructor(handler: InteractiveMessageHandler, channel: TextChannel | DMChannel, species: SpeciesObject) {
        super(handler, channel, { buttons: [
            {
                name: 'leftArrow',
                emoji: '⬅️'
            },
            {
                name: 'rightArrow',
                emoji: '➡️'
            },
            {
                name: 'info',
                emoji: 'ℹ️'
            }
        ]});

        this.species = species;
    }

    public async build(): Promise<void> {
        super.build();

        await this.species.load();

        this.setEmbed(this.buildEmbed());
    }

    private buildEmbed(): MessageEmbed {
        const newEmbed = new SmartEmbed();

        // Determine the image to display
        const image = this.species.getImages()[this.currentImage];

        // Set the embed's color
        newEmbed.setColor(getGuildUserDisplayColor(client.user, this.channel));

        // When the info message is showing a large picture of the species (not details)
        if (this.pictureMode) {
            newEmbed.setTitle(capitalizeFirstLetter(this.species.getCommonNames()[0]));

            newEmbed.addField('――――――――', capitalizeFirstLetter(this.species.getScientificName()), true);

            newEmbed.setImage(image.getUrl());
            const breed = image.getBreed();
            // Display a breed field if the current image is associated with one
            if (breed) {
                newEmbed.addField('Breed', capitalizeFirstLetter(breed), true);
            }
        }
        // When the info message is displaying the species' details
        else {
            newEmbed.setTitle(capitalizeFirstLetter(this.species.getScientificName()));

            newEmbed.setDescription(`Also known as: ${this.species.getCommonNames().join(', ')}`);

            newEmbed.addField('Description', this.species.getDescription());

            newEmbed.addField('Habitat', this.species.getNaturalHabitat());

            newEmbed.addField('More info', this.species.getWikiPage());

            // Use the currently selected image as a thumbnail instead
            newEmbed.setThumbnail(image.getUrl());
        }

        // Show the currently selected image's index
        newEmbed.setFooter(`${this.currentImage + 1}/${this.species.getImages().length}`);

        return newEmbed;
    }

    public buttonPress(buttonName: string, user: User): void {
        super.buttonPress(buttonName, user);

        switch (buttonName) {
            case 'rightArrow': {
                this.currentImage = this.currentImage + 1 >= this.species.getImages().length ? 0 : this.currentImage + 1;
                break;
            }
            case 'leftArrow': {
                this.currentImage = this.currentImage - 1 < 0 ? this.species.getImages().length - 1 : this.currentImage - 1;
                break;
            }
            case 'info': {
                this.pictureMode = !this.pictureMode;
                break;
            }
        }

        this.setEmbed(this.buildEmbed());
    }
}