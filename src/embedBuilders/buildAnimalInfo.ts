import { MessageEmbed } from "discord.js";
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildAnimalInfo(embed: MessageEmbed, animal: Animal): void {
    embed.setThumbnail(animal.card.url);
    embed.setTitle(`${animal.displayName}`);

    if (animal.nickname) {
        embed.setDescription(capitalizeFirstLetter(animal.species.commonNames[0]));
    }

    embed.addField("Species", capitalizeFirstLetter(animal.species.scientificName), true);
    
    embed.addField("Card", `${animal.species.indexOfCard(animal.card._id) + 1}/${animal.species.cards.length}`, true);

    if (animal.card.breed) {
        embed.addField("Breed", capitalizeFirstLetter(animal.card.breed));
    }

    if (animal.card.special) {
        embed.addField("Special", capitalizeFirstLetter(animal.card.special));
    }
    
    embed.addField("Level", animal.level);
    embed.addField("Value", `${animal.value} scraps`);
}