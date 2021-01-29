import { MessageEmbed } from "discord.js";
import Emojis from '../beastiary/Emojis';
import { Animal } from "../structures/GameObject/GameObjects/Animal";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildAnimalInfo(embed: MessageEmbed, animal: Animal): void {
    embed.setThumbnail(animal.card.url);
    embed.setTitle(`${animal.showcaseDisplayName}`);

    embed.setColor(animal.species.rarityData.color);

    if (animal.nickname) {
        embed.setDescription(capitalizeFirstLetter(animal.species.commonNames[0]));
    }

    embed.addField("Species", `${animal.species.rarityData.emoji} ${capitalizeFirstLetter(animal.species.scientificName)}`, true);
    
    embed.addField("Card", `${animal.species.indexOfCard(animal.card._id) + 1}/${animal.species.cards.length}`, true);

    if (animal.card.breed) {
        embed.addField("Breed", capitalizeFirstLetter(animal.card.breed));
    }

    if (animal.card.special) {
        embed.addField("Special", capitalizeFirstLetter(animal.card.special));
    }

    let levelText = `Level ${animal.level}`;
    let experienceText = `${Emojis.xp}${animal.experience}`;
    if (animal.level >= animal.levelCap) {
        levelText += " (MAX)";
    }
    else {
        experienceText += `/${animal.nextLevelXp}`;
    }
    embed.addField(levelText, experienceText);

    embed.addField("Value", `${animal.value}${Emojis.pep}`, true);

    const showToken = animal.owner && animal.owner.hasToken(animal.species.id);
    let tokenString = "*Unknown*";
    if (showToken) {
        tokenString = `${animal.species.token} ${Emojis.token}`;
    }
    embed.addField("Token", capitalizeFirstLetter(tokenString), true);
}