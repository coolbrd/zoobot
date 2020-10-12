import { MessageEmbed } from "discord.js";

import { SpeciesCard, Species } from "../models/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildSpeciesInfo(embed: MessageEmbed, species: Species, card: SpeciesCard): void {
    embed.setTitle(capitalizeFirstLetter(species.scientificName));

    embed.setDescription(`Also known as: ${species.commonNames.join(", ")}`);

    embed.addField("Description", species.description);

    embed.addField("Habitat", species.naturalHabitat);

    embed.addField("More info", species.wikiPage);

    embed.setThumbnail(card.url);
}