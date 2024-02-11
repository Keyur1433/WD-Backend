class ApiResponse {
    constructor(statusCode, data, message = "Success") {
        // Initialize properties based on constructor arguments
        this.statusCode = statusCode; // Set the HTTP status code
        this.data = data; // Set the data returned by the API
        this.message = message; // Set the message of the response
        // Determine success based on status code
        this.success = statusCode < 400; // If status code is less than 400, it's a success
    }
}
