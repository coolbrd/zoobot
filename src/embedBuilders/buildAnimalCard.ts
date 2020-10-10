import { MessageEmbed } from "discord.js";

import { Animal } from "../models/Animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

// Takes an embed and builds it to display an animal object's card
export default function buildAnimalCard(embed: MessageEmbed, animalObject: Animal): void {
    const species = animalObject.getSpecies();
    const card = animalObject.getCard();

    const animalDisplayName = animalObject.getNickname() || capitalizeFirstLetter(animalObject.getName());

    embed.setImage(card.getUrl());
    embed.setTitle(animalDisplayName);
    embed.setDescription(`Card #${card.getIndex() + 1} of ${species.getCardCount()}`);
}