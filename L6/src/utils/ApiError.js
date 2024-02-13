class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message); // Call the constructor of the superclass (Error) with the provided message
        // Initialize properties based on constructor arguments
        this.statusCode = statusCode; // Set the HTTP status code
        this.data = null; // Initialize data to null
        this.message = message; // Set the error message
        this.success = false; // Set success to false as it's an error
        this.errors = errors; // Set any additional errors
        // Capture stack trace if provided, otherwise use default stack trace capturing
        if (stack) {
            this.stack = stack; // Set stack trace if provided
        } else {
            Error.captureStackTrace(this, this.constructor); // Capture stack trace
        }
    }
}

export {ApiError}