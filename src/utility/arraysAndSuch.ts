export function capitalizeFirstLetter(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Determines whether or not a string contains a substring that's either isolated by spaces, or at the beginning or end of the string
export function containsIsolatedSubstring(searchString: string, substring: string): boolean {
    const substringStartIndex = searchString.indexOf(substring);

    const containsSubstring = substringStartIndex !== -1;

    if (!containsSubstring) {
        return false;
    }

    const substringEndIndex = substringStartIndex + substring.length - 1;

    const leftSideAtBeginning = substringStartIndex === 0;
    const rightSideAtEnd = substringEndIndex === searchString.length - 1;

    const leftSideIsolated = leftSideAtBeginning || searchString[substringStartIndex - 1] === " ";
    const rightSideIsolted = rightSideAtEnd || searchString[substringEndIndex + 1] === " ";

    return leftSideIsolated && rightSideIsolted;
}

// Takes an array of strings and returns its fully lowercase equivalent
export function arrayToLowerCase(array: string[]): string[] {
    const newArray: string[] = [];
    array.forEach(element => {
        newArray.push(element.toLowerCase());
    });
    return newArray;
}

// Joins an array by a given string, and uses comma separation by default if no delimiter is provided
export function safeArrayJoin(array: unknown[], delimiter?: string): string {
    return array.join(delimiter ? delimiter : ", ");
}

// Takes either a string value or an array of strings and converts it to a single string
export function joinIfArray(value: string | string[] | undefined, delimiter?: string): string | undefined {
    return Array.isArray(value) ? safeArrayJoin(value, delimiter) : value;
}

// Get the number of occurrences of a given element in a given array
export function arrayElementCount<T>(array: T[], element: T): number {
    let count = 0;

    for (const current of array) {
        if (current === element) {
            count++;
        }
    }
    return count;
}

export function hasDuplicates<T>(array: T[]): boolean {
    const encounteredElements: T[] = [];

    for (const currentElement of array) {
        if (encounteredElements.includes(currentElement)) {
            return true;
        }

        encounteredElements.push(currentElement);
    }

    return false;
}

// Gets the index of an element within a list where a predicate function is satisfied
export function indexWhere<T>(list: T[], predicate: (element: T) => boolean): number {
    let indexInList = -1;

    list.some((currentElement, currentIndex) => {
        if (predicate(currentElement)) {
            indexInList = currentIndex;
            return true;
        }
    });

    return indexInList;
}

export function safeListAccess<T>(list: T[], index: number): T | undefined {
    if (index < 0 || index >= list.length) {
        return undefined;
    }

    return list[index];
}

export function getRandomElement<T>(list: T[]): T {
    const randomIndex = Math.floor(Math.random() * list.length);

    return list[randomIndex];
}