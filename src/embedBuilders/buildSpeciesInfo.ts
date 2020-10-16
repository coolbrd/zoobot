import { MessageEmbed } from "discord.js";
import rarityToEmbedColor from "../beastiary/rarityToEmbedColor";

import { SpeciesCard, Species } from "../models/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildSpeciesInfo(embed: MessageEmbed, species: Species, card: SpeciesCard): void {
    embed.setColor(rarityToEmbedColor(species.rarity));

    embed.setTitle(capitalizeFirstLetter(species.scientificName));

    embed.setDescription(`Commonly known as: ${species.commonNames.join(", ")}`);

    embed.addField("Description", species.description);

    embed.addField("Habitat", species.naturalHabitat);

    embed.addField("More info", species.wikiPage);

    embed.setThumbnail(card.url);
}