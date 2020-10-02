import { MessageEmbed } from "discord.js";
import { AnimalObject } from "../models/animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

// Takes an embed and an animal object, and builds out that embed's fields to display the animal's information
export default function buildAnimalInfo(embed: MessageEmbed, animalObject: AnimalObject): void {
    // Get basic information about the animal
    const species = animalObject.getSpecies();
    const image = animalObject.getImage();
    const breed = image.getBreed();

    // Prefer to use the animal's nickname, but if it doesn't have one use the primary common name
    const animalDisplayName = animalObject.getNickname() || capitalizeFirstLetter(animalObject.getName());
    
    // Set fields
    embed.setThumbnail(image.getUrl());
    embed.setTitle(`${animalDisplayName}`);
    embed.addField('Species', capitalizeFirstLetter(species.getScientificName()), true);
    embed.addField('Card', `${image.getIndex() + 1}/${species.getImages().length}`, true);

    // Only show the animal's common name if its nickname is displayed
    animalObject.getNickname() && embed.setDescription(capitalizeFirstLetter(animalObject.getSpecies().getCommonNames()[0]));
    // Only add a breed field if the animal has one
    breed && embed.addField('Breed', capitalizeFirstLetter(breed));
}