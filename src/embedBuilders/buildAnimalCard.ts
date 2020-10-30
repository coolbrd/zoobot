import { MessageEmbed } from "discord.js";
import { Animal } from "../models/Animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildAnimalCard(embed: MessageEmbed, animal: Animal): void {
    embed.setTitle(animal.displayName);
    embed.setImage(animal.card.url);
    embed.addField("――――――――", `Card #${animal.species.indexOfCard(animal.card._id) + 1} of ${animal.species.cardCount}`, true);

    animal.card.breed && embed.addField("Breed", capitalizeFirstLetter(animal.card.breed), true);
    animal.card.special && embed.addField("Special", capitalizeFirstLetter(animal.card.special), true);
}