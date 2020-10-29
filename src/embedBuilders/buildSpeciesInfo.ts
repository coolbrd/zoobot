import { MessageEmbed } from "discord.js";
import getRarityInfo from "../beastiary/rarityToEmbedColor";
import { Species, SpeciesCard } from "../models/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

// Build's a species' information embed
export default function buildSpeciesInfo(embed: MessageEmbed, species: Species, card: SpeciesCard): void {
    const speciesRarity = getRarityInfo(species.rarity);

    embed.setColor(speciesRarity.color);

    embed.setTitle(capitalizeFirstLetter(species.scientificName));

    embed.setDescription(`Commonly known as: ${species.commonNames.join(", ")}`);

    embed.addField("Description", species.description);

    embed.addField("Habitat", species.naturalHabitat);

    embed.addField("Rarity", capitalizeFirstLetter(speciesRarity.text));

    embed.addField("More info", species.wikiPage);

    embed.setThumbnail(card.url);
}