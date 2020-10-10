// Takes a value and its bounds, returns a value within the bounds if the given value is outside them
export default function loopValue(value: number, min: number, max: number): number {
    if (value > max) {
        return min + (value - max - 1);
    }
    else if (value < min) {
        return max - (min - value - 1);
    }
    else {
        return value;
    }
}