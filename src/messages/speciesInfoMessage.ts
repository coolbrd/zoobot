import { InteractiveMessage } from "./interactiveMessage";
import { DMChannel, TextChannel, MessageEmbed } from "discord.js";
import { SpeciesObject } from "../models/species";
import { SmartEmbed } from "../utility/smartEmbed";
import { capitalizeFirstLetter } from "../utility/toolbox";

export class SpeciesInfoMessage extends InteractiveMessage {
    private readonly species: SpeciesObject;

    private currentImage = 0;

    public constructor(channel: TextChannel | DMChannel, species: SpeciesObject) {
        super(channel, { buttons: [
            {
                name: 'leftArrow',
                emoji: '⬅️'
            },
            {
                name: 'rightArrow',
                emoji: '➡️'
            }
        ]});

        this.species = species;

        this.setEmbed(this.buildEmbed());
    }

    private buildEmbed(): MessageEmbed {
        const newEmbed = new SmartEmbed();

        newEmbed.setTitle(capitalizeFirstLetter(this.species.commonNames[0]));
        newEmbed.setDescription(capitalizeFirstLetter(this.species.scientificName));
        newEmbed.setImage(this.species.images[this.currentImage].url);

        return newEmbed;
    }
}