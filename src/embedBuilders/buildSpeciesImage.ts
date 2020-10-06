import { MessageEmbed } from "discord.js";
import { ImageSubObject, SpeciesObject } from "../models/species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildSpeciesImage(embed: MessageEmbed, species: SpeciesObject, image: ImageSubObject): void {
    embed.setTitle(capitalizeFirstLetter(species.getCommonNames()[0]));

    embed.addField('――――――――', capitalizeFirstLetter(species.getScientificName()), true);

    embed.setImage(image.getUrl());
    const breed = image.getBreed();
    // Display a breed field if the current image is associated with one
    if (breed) {
        embed.addField('Breed', capitalizeFirstLetter(breed), true);
    }
}