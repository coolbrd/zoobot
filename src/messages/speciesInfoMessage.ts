import { DMChannel, TextChannel, MessageEmbed, User } from "discord.js";

import InteractiveMessage from "../interactiveMessage/interactiveMessage";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";
import { client } from "..";
import { SpeciesObject } from "../models/species";
import InteractiveMessageHandler from "../interactiveMessage/interactiveMessageHandler";
import getGuildUserDisplayColor from "../discordUtility/getGuildUserDisplayColor";
import SmartEmbed from "../discordUtility/smartEmbed";
import { errorHandler } from "../structures/errorHandler";
import buildSpeciesInfo from "../embedBuilders/buildSpeciesInfo";
import buildSpeciesImage from "../embedBuilders/buildSpeciesImage";

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
                emoji: '⬅️',
                helpMessage: 'Previous card'
            },
            {
                name: 'rightArrow',
                emoji: '➡️',
                helpMessage: 'Next card'
            },
            {
                name: 'info',
                emoji: 'ℹ️',
                helpMessage: 'Info'
            }
        ]});

        this.species = species;
    }

    public async build(): Promise<void> {
        super.build();

        try {
            await this.species.load();
        }
        catch (error) {
            errorHandler.handleError(error, 'There was an error loading a species in a species info message.');
            return;
        }

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
            buildSpeciesImage(newEmbed, this.species, image);
        }
        // When the info message is displaying the species' details
        else {
            buildSpeciesInfo(newEmbed, this.species, image);
        }

        let footerText = `Card #${this.currentImage + 1}/${this.species.getImages().length}\n`;
        footerText += this.getButtonHelpString();
        newEmbed.setFooter(footerText);

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