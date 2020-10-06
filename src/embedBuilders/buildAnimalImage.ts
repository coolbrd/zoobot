import { MessageEmbed } from "discord.js";
import { AnimalObject } from "../models/animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

// Takes an embed and builds it to display an animal object's image
export default function buildAnimalImage(embed: MessageEmbed, animalObject: AnimalObject): void {
    const species = animalObject.getSpecies();
    const image = animalObject.getImage();

    const animalDisplayName = animalObject.getNickname() || capitalizeFirstLetter(animalObject.getName());

    embed.setImage(image.getUrl());
    embed.setTitle(animalDisplayName);
    embed.setDescription(`Card #${image.getIndex() + 1} of ${species.getImageCount()}`);
}