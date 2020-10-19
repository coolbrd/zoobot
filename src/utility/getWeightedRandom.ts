// Selects a random item from a map of items and their respective weights
// Two items with the same weigh will have the same chance to be selected as one another
// An item with 10% the weight of another will, surprisingly, be selected 10% as often as the other item
export default function getWeightedRandom<T>(items: Map<T, number>): T {
    if (items.size <= 0) {
        throw new Error(`An empty map was given to getWeightedRandom.`);
    }

    // Calculate the cumulative weight of the item pool
    let totalWeight = 0;
    for (const weight of items.values()) {
        totalWeight += weight;
    }

    // Generate a random number that represents one of the items in the list
    const random = Math.random() * totalWeight;

    // The current sum of all weights
    let currentSum = 0;
    // Iterate over every item in the map
    for (const [item, weight] of items.entries()) {
        // If the random number falls within the range of the current item's weight
        if (random < currentSum + weight) {
            // Return the item, it's been chosen
            return item;
        }
        // If the current item wasn't selected, add its weight and move onto the next item
        currentSum += weight;
    }

    // This should never happen
    throw new Error("No item selected from weighted random function. This shouldn't happen.");
}