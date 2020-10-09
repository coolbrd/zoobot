import { MessageEmbed } from "discord.js";
import { SpeciesCard, Species } from "../models/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildSpeciesInfo(embed: MessageEmbed, species: Species, card: SpeciesCard): void {
    embed.setTitle(capitalizeFirstLetter(species.getScientificName()));

    embed.setDescription(`Also known as: ${species.getCommonNames().join(', ')}`);

    embed.addField('Description', species.getDescription());

    embed.addField('Habitat', species.getNaturalHabitat());

    embed.addField('More info', species.getWikiPage());

    embed.setThumbnail(card.getUrl());
}