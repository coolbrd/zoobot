import { MessageEmbed } from "discord.js";
import { ImageSubObject, SpeciesObject } from "../models/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildSpeciesInfo(embed: MessageEmbed, species: SpeciesObject, image: ImageSubObject): void {
    embed.setTitle(capitalizeFirstLetter(species.getScientificName()));

    embed.setDescription(`Also known as: ${species.getCommonNames().join(', ')}`);

    embed.addField('Description', species.getDescription());

    embed.addField('Habitat', species.getNaturalHabitat());

    embed.addField('More info', species.getWikiPage());

    embed.setThumbnail(image.getUrl());
}