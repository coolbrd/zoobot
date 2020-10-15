import { MessageEmbed } from "discord.js";

import { Animal } from "../models/Animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

// Takes an embed and builds it to display an animal object's card
export default function buildAnimalCard(embed: MessageEmbed, animalObject: Animal): void {
    const species = animalObject.species;
    const card = animalObject.card;

    const animalDisplayName = animalObject.nickname || capitalizeFirstLetter(animalObject.name);

    embed.setTitle(animalDisplayName);
    embed.setImage(card.url);
    embed.addField("――――――――", `Card #${card.index + 1} of ${species.cardCount}`, true);

    if (card.breed) {
        embed.addField("Breed", capitalizeFirstLetter(card.breed), true);
    }
    if (card.special) {
        embed.addField("Special", capitalizeFirstLetter(card.special), true);
    }
}