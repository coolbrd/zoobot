import { MessageEmbed } from "discord.js";
import { Player } from "../structures/GameObject/GameObjects/Player";
import { Species, SpeciesCard } from "../structures/GameObject/GameObjects/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildSpeciesInfo(embed: MessageEmbed, species: Species, card: SpeciesCard, player?: Player): void {
    embed.setColor(species.rarityData.color);
    embed.setTitle(capitalizeFirstLetter(species.scientificName));
    embed.setThumbnail(card.url);
    embed.setDescription(`Commonly known as: ${species.commonNames.join(", ")}`);

    embed.addField("Info", species.description);
    
    if (species.naturalHabitat) {
        embed.addField("Habitat", species.naturalHabitat);
    }

    embed.addField("Rarity", `${species.rarityData.emoji} T${species.rarityData.tier}`, true);
    embed.addField("Base value", `${species.baseValue} scraps`, true);
    embed.addField("More info", species.wikiPage, true);

    if (player) {
        const showToken = player.hasToken(species);
        let tokenString = "*Unknown*";
        if (showToken) {
            tokenString = species.token;
        }
        embed.addField("Token", capitalizeFirstLetter(tokenString));
    }
}