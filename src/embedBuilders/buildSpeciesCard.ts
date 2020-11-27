import { stripIndent } from 'common-tags';
import { MessageEmbed } from "discord.js";
import BeastiaryClient from "../bot/BeastiaryClient";
import { Species, SpeciesCard } from "../structures/GameObject/GameObjects/Species";
import { capitalizeFirstLetter } from "../utility/arraysAndSuch";

export default function buildSpeciesCard(embed: MessageEmbed, species: Species, card: SpeciesCard, beastiaryClient: BeastiaryClient): void {
    const speciesRarity = beastiaryClient.beastiary.encounters.getRarityInfo(species.rarity);

    embed.setColor(speciesRarity.color);

    embed.setTitle(capitalizeFirstLetter(species.commonNames[0]));

    const rarityEmojiString = beastiaryClient.beastiary.emojis.getByName(speciesRarity.emojiName);

    embed.addField("――――――――", `${rarityEmojiString} ${capitalizeFirstLetter(species.scientificName)}`, true);

    if (card.breed) {
        embed.addField("Breed", capitalizeFirstLetter(card.breed), true);
    }

    if (card.special) {
        embed.addField("Special", capitalizeFirstLetter(card.special), true);
    }

    embed.setImage(card.url);

    embed.setFooter(`Card #${species.indexOfCard(card._id) + 1} of ${species.cardCount}`);
}