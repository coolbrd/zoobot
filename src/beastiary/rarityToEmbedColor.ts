import { encounterHandler } from "./EncounterHandler"

interface RarityInfo {
    tier: string,
    color: number,
    percentage: number
}

// Gets some visual indication info for any given weighted rarity value
export default function getRarityInfo(rarity: number): RarityInfo {
    const totalRarityWeight = encounterHandler.getTotalRarityWeight();

    const dropChance = rarity / totalRarityWeight;

    const tierColors = [0x557480, 0x49798b, 0x3e6297, 0x2c67a9, 0x1a97bb, 0x0fc6c6, 0x07cd9c, 0x17bd52, 0x417c36, 0xbbae13, 0xf9da04, 0xf3850a, 0xef0e3a, 0xda23c8, 0xff80ff, 0xFFFFFF];

    let tier = 0;
    while (tier <= tierColors.length) {
        const tierMinimumChance = 0.5/(Math.pow(2, tier));

        if (dropChance >= tierMinimumChance) {
            return {
                tier: tier.toString(),
                color: tierColors[tier],
                percentage: dropChance
            }
        }

        tier += 1;
    }

    return {
        tier: "U",
        color: tierColors[tier + 1],
        percentage: dropChance
    }
}