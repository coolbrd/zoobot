import { DMChannel, TextChannel, MessageEmbed, User } from "discord.js";

import InteractiveMessage from "../interactiveMessage/InteractiveMessage";
import { client } from "..";
import { SpeciesObject } from "../models/Species";
import getGuildUserDisplayColor from "../discordUtility/getGuildUserDisplayColor";
import SmartEmbed from "../discordUtility/SmartEmbed";
import { errorHandler } from "../structures/ErrorHandler";
import buildSpeciesInfo from "../embedBuilders/buildSpeciesInfo";
import buildSpeciesImage from "../embedBuilders/buildSpeciesImage";
import loopValue from "../utility/loopValue";

export default class SpeciesInfoMessage extends InteractiveMessage {
    private readonly species: SpeciesObject;
    // The current image of the species that's being displayed by the info message
    private currentImage = 0;
    // Whether the info message is displaying a large image, or the species' details
    private pictureMode = true;

    constructor(channel: TextChannel | DMChannel, species: SpeciesObject) {
        super(channel, { buttons: [
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
                emoji: '❔',
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
        const embed = new SmartEmbed();

        // Determine the image to display
        const image = this.species.getImages()[this.currentImage];

        // Set the embed's color
        embed.setColor(getGuildUserDisplayColor(client.user, this.channel));

        // When the info message is showing a large picture of the species (not details)
        if (this.pictureMode) {
            buildSpeciesImage(embed, this.species, image);
        }
        // When the info message is displaying the species' details
        else {
            buildSpeciesInfo(embed, this.species, image);
        }

        embed.appendToFooter('\n' + this.getButtonHelpString());

        return embed;
    }

    public buttonPress(buttonName: string, user: User): void {
        super.buttonPress(buttonName, user);

        switch (buttonName) {
            case 'rightArrow': {
                this.currentImage = loopValue(this.currentImage + 1, 0, this.species.getImages().length);
                break;
            }
            case 'leftArrow': {
                this.currentImage = loopValue(this.currentImage - 1, 0, this.species.getImages().length);
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