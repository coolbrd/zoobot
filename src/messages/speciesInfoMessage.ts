import { InteractiveMessage, InteractiveMessageHandler } from "./interactiveMessage";
import { DMChannel, TextChannel, MessageEmbed, User } from "discord.js";
import { SmartEmbed } from "../utility/smartEmbed";
import { capitalizeFirstLetter, getGuildUserDisplayColor } from "../utility/toolbox";
import { client } from "..";
import { Document } from "mongoose";

export class SpeciesInfoMessage extends InteractiveMessage {
    private readonly species: Document;
    // The current image of the species that's being displayed by the info message
    private currentImage = 0;
    // Whether the info message is displaying a large image, or the species' details
    private pictureMode = true;

    public constructor(handler: InteractiveMessageHandler, channel: TextChannel | DMChannel, species: Document) {
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

        this.setEmbed(this.buildEmbed());
    }

    private buildEmbed(): MessageEmbed {
        const newEmbed = new SmartEmbed();

        // Determine the image to display
        const image = this.species.get('images')[this.currentImage];

        // Set the embed's color
        newEmbed.setColor(getGuildUserDisplayColor(client.user, this.channel));

        // When the info message is showing a large picture of the species (not details)
        if (this.pictureMode) {
            newEmbed.setTitle(capitalizeFirstLetter(this.species.get('commonNames')[0]));

            newEmbed.addField('――――――――', capitalizeFirstLetter(this.species.get('scientificName')), true);

            newEmbed.setImage(image.url);
            // Display a breed field if the current image is associated with one
            if (image.breed) {
                newEmbed.addField('Breed', capitalizeFirstLetter(image.breed), true);
            }
        }
        // When the info message is displaying the species' details
        else {
            newEmbed.setTitle(capitalizeFirstLetter(this.species.get('scientificName')));

            newEmbed.setDescription(`Also known as: ${this.species.get('commonNames').join(', ')}`);

            newEmbed.addField('Description', this.species.get('description'));

            newEmbed.addField('Habitat', this.species.get('naturalHabitat'));

            newEmbed.addField('More info', this.species.get('wikiPage'));

            // Use the currently selected image as a thumbnail instead
            newEmbed.setThumbnail(image.url);
        }

        // Show the currently selected image's index
        newEmbed.setFooter(`${this.currentImage + 1}/${this.species.get('images').length}`);

        return newEmbed;
    }

    public buttonPress(buttonName: string, user: User): void {
        super.buttonPress(buttonName, user);

        switch (buttonName) {
            case 'rightArrow': {
                this.currentImage = this.currentImage + 1 >= this.species.get('images').length ? 0 : this.currentImage + 1;
                break;
            }
            case 'leftArrow': {
                this.currentImage = this.currentImage - 1 < 0 ? this.species.get('images').length - 1 : this.currentImage - 1;
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