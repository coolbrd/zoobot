class ErrorHandler {
    public handleError(error: Error, message?: string): void {
        console.error(message || "Error message from the centralized error-handling component", error);
    }
}
export const errorHandler = new ErrorHandler();