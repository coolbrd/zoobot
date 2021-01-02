export function randomWithinRange(randomValue: number, min: number, max: number): number {
    const range = max - min;

    const offset = randomValue * range;

    return min + offset;
}