// Selects a random item from a map of items and their respective weights
export default function getWeightedRandom<T>(items: Map<T, number>): T {
    if (items.size <= 0) {
        throw new Error(`An empty map was given to getWeightedRandom.`);
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

    throw new Error("No item selected from weighted random function. This shouldn't happen.");
}