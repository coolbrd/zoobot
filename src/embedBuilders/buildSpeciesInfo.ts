import { MessageEmbed } from "discord.js";
import getRarityInfo from "../beastiary/rarityToEmbedColor";
import { Species, SpeciesCard } from "../models/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildSpeciesInfo(embed: MessageEmbed, species: Species, card: SpeciesCard): void {
    const speciesRarity = getRarityInfo(species.rarity);

    embed.setColor(speciesRarity.color);
    embed.setTitle(capitalizeFirstLetter(species.scientificName));
    embed.setThumbnail(card.url);
    embed.setDescription(`Commonly known as: ${species.commonNames.join(", ")}`);

    embed.addField("Description", species.description);
    embed.addField("Habitat", species.naturalHabitat);
    embed.addField("Rarity", `T${speciesRarity.tier}`, true);
    embed.addField("More info", species.wikiPage, true);
}