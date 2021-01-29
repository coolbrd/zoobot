import { MessageEmbed } from "discord.js";
import Emojis from '../beastiary/Emojis';
import { Player } from "../structures/GameObject/GameObjects/Player";
import { Species, SpeciesCard } from "../structures/GameObject/GameObjects/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildSpeciesInfo(embed: MessageEmbed, species: Species, card: SpeciesCard, player?: Player): void {
    embed.setColor(species.rarityData.color);
    embed.setTitle(capitalizeFirstLetter(species.scientificName));
    embed.setThumbnail(card.url);
    embed.setDescription(`Commonly known as: ${species.commonNames.join(", ")}`);

    embed.addField("Info", `${species.description} [More info](${species.wikiPage})`);
    
    if (species.naturalHabitat) {
        embed.addField("Habitat", species.naturalHabitat);
    }

    embed.addField("Rarity", `${species.rarityData.emoji} T${species.rarityData.tier}`, true);

    embed.addField("Base value", `${species.baseValue}${Emojis.pep}`, true);

    if (player) {
        const showToken = player.hasToken(species.id);
        let tokenString = "*Unknown*";
        if (showToken) {
            tokenString = `${species.token} ${Emojis.token}`;
        }
        embed.addField("Token", capitalizeFirstLetter(tokenString), true);

        const speciesRecord = player.getSpeciesRecord(species.id);

        embed.addField("Essence", `${speciesRecord.data.essence}${Emojis.essence}`, true);

        embed.addField("Max level", player.getSpeciesLevelCap(species.id), true);

        embed.addField("Captured", speciesRecord.data.captures, true);
    }
}