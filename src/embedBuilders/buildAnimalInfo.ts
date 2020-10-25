import { MessageEmbed } from "discord.js";
import { Animal } from "../models/Animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

// Takes an embed and an animal object, and builds out that embed's fields to display the animal's information
export default function buildAnimalInfo(embed: MessageEmbed, animalObject: Animal): void {
    // Get basic information about the animal
    const species = animalObject.species;
    const card = animalObject.card;
    const breed = card.breed;

    // Prefer to use the animal's nickname, but if it doesn't have one use the primary common name
    const animalDisplayName = animalObject.nickname || capitalizeFirstLetter(animalObject.name);
    
    // Set fields
    embed.setThumbnail(card.url);
    embed.setTitle(`${animalDisplayName}`);
    embed.addField("Species", capitalizeFirstLetter(species.scientificName), true);
    embed.addField("Card", `${card.index + 1}/${species.cards.length}`, true);
    breed && embed.addField("Breed", capitalizeFirstLetter(breed), true);
    card.special && embed.addField("Special", capitalizeFirstLetter(card.special), true);
    embed.addField("Experience", animalObject.experience);

    // Only show the animal's common name if its nickname is displayed
    animalObject.nickname && embed.setDescription(capitalizeFirstLetter(animalObject.species.commonNames[0]));
}