import { MessageEmbed } from "discord.js";
import { Animal } from "../models/Animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildAnimalInfo(embed: MessageEmbed, animal: Animal): void {
    embed.setThumbnail(animal.card.url);
    embed.setTitle(`${animal.displayName}`);
    embed.addField("Species", capitalizeFirstLetter(animal.species.scientificName), true);
    embed.addField("Card", `${animal.species.indexOfCard(animal.card._id) + 1}/${animal.species.cards.length}`, true);

    animal.card.breed && embed.addField("Breed", capitalizeFirstLetter(animal.card.breed), true);
    animal.card.special && embed.addField("Special", capitalizeFirstLetter(animal.card.special), true);
    
    embed.addField("Experience", animal.experience);
    embed.addField("Value", animal.value, true)

    animal.nickname && embed.setDescription(capitalizeFirstLetter(animal.species.commonNames[0]));
}