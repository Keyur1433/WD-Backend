// 2nd method:-

const asyncHandler = (requestHandler) => {
    // Return a function to handle async operations
    return (req, res, next) => {
        // Wrap requestHandler in a Promise to handle async operations
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
};

export {asyncHandler}



// 1st method:-

// const asyncHandler = () => {}
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => {async () => {}}

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn (req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }