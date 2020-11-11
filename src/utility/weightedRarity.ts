import { stripIndents } from "common-tags";

// Selects a random item from a map of items and their respective weights
export function getWeightedRandom<T>(items: Map<T, number>): T {
    if (items.size <= 0) {
        throw new Error(stripIndents`
            An empty map was given to getWeightedRandom.
        `);
    }

    let totalWeight = 0;
    for (const weight of items.values()) {
        totalWeight += weight;
    }

    const random = Math.random() * totalWeight;

    let currentSum = 0;
    for (const [item, weight] of items.entries()) {
        if (random < currentSum + weight) {
            return item;
        }
        currentSum += weight;
    }

    throw new Error(stripIndents`
        No item selected from weighted random function. This shouldn't happen.
    `);
}

export function getWeightedRarityMinimumOccurrence(weightedRarity: number, descendingWeightedRarityList: number[]): number {
    let totalWeightedRarity = 0;
    let totalWeightGreaterThanRarity = 0;

    descendingWeightedRarityList.forEach(currentWeightedRarity => {
        if (currentWeightedRarity > weightedRarity) {
            totalWeightGreaterThanRarity += currentWeightedRarity;
        }

        totalWeightedRarity += currentWeightedRarity;
    });

    return 1- totalWeightGreaterThanRarity / totalWeightedRarity;
}