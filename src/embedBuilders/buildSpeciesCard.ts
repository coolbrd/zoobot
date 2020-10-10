import { MessageEmbed } from "discord.js";

import { SpeciesCard, Species } from "../models/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildSpeciesCard(embed: MessageEmbed, species: Species, card: SpeciesCard): void {
    embed.setTitle(capitalizeFirstLetter(species.getCommonNames()[0]));

    embed.addField("――――――――", capitalizeFirstLetter(species.getScientificName()), true);

    embed.setImage(card.getUrl());
    const breed = card.getBreed();
    // Display a breed field if the current card has one
    if (breed) {
        embed.addField("Breed", capitalizeFirstLetter(breed), true);
    }

    embed.setFooter(`Card #${card.getIndex() + 1} of ${species.getCardCount()}`);
}