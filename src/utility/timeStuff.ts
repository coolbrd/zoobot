// Get the total number of milliseconds that have passed today
export function todaysMilliseconds(): number {
    const now = new Date();

    return now.getHours() * 60 * 60 * 1000 + now.getMinutes() * 60 * 1000 + now.getSeconds() * 1000 + now.getMilliseconds();
}

// Get a string representing the number of hours, minutes, and seconds remaining until a given time
export function remainingTimeString(targetTime: Date): string {
    const now = new Date();
    const secondsToTarget = (targetTime.valueOf() - now.valueOf()) / 1000;
    const minutesToTarget = secondsToTarget / 60;
    const hoursToTarget = Math.floor(minutesToTarget / 60);
    const leftoverMinutes = Math.floor(minutesToTarget % 60);
    const leftoverSeconds = Math.floor(secondsToTarget % 60);

    return `${hoursToTarget}h ${leftoverMinutes}m ${leftoverSeconds}s`;
}