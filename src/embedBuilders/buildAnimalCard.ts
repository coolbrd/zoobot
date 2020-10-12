import { MessageEmbed } from "discord.js";

import { Animal } from "../models/Animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

// Takes an embed and builds it to display an animal object's card
export default function buildAnimalCard(embed: MessageEmbed, animalObject: Animal): void {
    const species = animalObject.species;
    const card = animalObject.card;

    const animalDisplayName = animalObject.nickname || capitalizeFirstLetter(animalObject.name);

    embed.setImage(card.url);
    embed.setTitle(animalDisplayName);
    embed.setDescription(`Card #${card.index + 1} of ${species.cardCount}`);
}