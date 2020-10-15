import { MessageEmbed } from "discord.js";

import { SpeciesCard, Species } from "../models/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildSpeciesCard(embed: MessageEmbed, species: Species, card: SpeciesCard): void {
    embed.setTitle(capitalizeFirstLetter(species.commonNames[0]));

    embed.addField("――――――――", capitalizeFirstLetter(species.scientificName), true);

    embed.setImage(card.url);
    // Display a breed field if the current card has one
    if (card.breed) {
        embed.addField("Breed", capitalizeFirstLetter(card.breed), true);
    }
    if (card.special) {
        embed.addField("Special", capitalizeFirstLetter(card.special), true);
    }

    embed.setFooter(`Card #${card.index + 1} of ${species.cardCount}`);
}