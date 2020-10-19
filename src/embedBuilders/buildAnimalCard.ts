import { MessageEmbed } from "discord.js";
import { Animal } from "../models/Animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

// Takes an embed and builds it to display an animal object's card
export default function buildAnimalCard(embed: MessageEmbed, animalObject: Animal): void {
    const species = animalObject.species;
    const card = animalObject.card;

    // Use the animal's nickname (uncapitalized) if it has one, otherwise use the animal's determined name
    const animalDisplayName = animalObject.nickname || capitalizeFirstLetter(animalObject.name);

    embed.setTitle(animalDisplayName);
    embed.setImage(card.url);
    embed.addField("――――――――", `Card #${card.index + 1} of ${species.cardCount}`, true);

    // Add optional fields
    card.breed && embed.addField("Breed", capitalizeFirstLetter(card.breed), true);
    card.special && embed.addField("Special", capitalizeFirstLetter(card.special), true);
}