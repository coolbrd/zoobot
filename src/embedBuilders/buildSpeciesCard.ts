import { MessageEmbed } from "discord.js";
import { Species, SpeciesCard } from "../structures/GameObject/GameObjects/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildSpeciesCard(embed: MessageEmbed, species: Species, card: SpeciesCard): void {
    embed.setColor(species.rarityData.color);

    embed.setTitle(capitalizeFirstLetter(species.commonNames[0]));

    embed.addField("――――――――", `${species.rarityData.emoji} ${capitalizeFirstLetter(species.scientificName)}`, true);

    if (card.breed) {
        embed.addField("Breed", capitalizeFirstLetter(card.breed), true);
    }

    if (card.special) {
        embed.addField("Special", capitalizeFirstLetter(card.special), true);
    }

    embed.setImage(card.url);

    embed.setFooter(`Card #${species.indexOfCard(card._id) + 1} of ${species.cardCount}`);
}