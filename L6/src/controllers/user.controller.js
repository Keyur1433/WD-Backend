import { asyncHandler } from "../utils/asyncHandler.js"; // Importing asyncHandler to handle asynchronous operations
import { ApiError } from "../utils/ApiError.js"; // Importing custom error class for API errors
import { User } from "../models/user.model.js"; // Importing User model
import { uploadOnCloudinary } from "../utils/cloudinary.js"; // Importing function to upload files to Cloudinary
import { ApiResponse } from "../utils/ApiResponse.js"; // Importing ApiResponse class for consistent API responses
import jwt from "jsonwebtoken"; // Importing JWT for token generation and verification
import mongoose from "mongoose";

// Function to generate access and refresh tokens for a given user ID
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        // Find user by ID
        const user = await User.findById(userId);
        // Generate access and refresh tokens
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Save refreshToken in the database
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken }; // Return tokens

    } catch (error) {
        // If an error occurs, throw an ApiError
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens");
    }
}

// Controller function to handle user registration
const registerUser = asyncHandler(async (req, res) => {
    // Extract user details from request body
    const { fullName, email, username, password } = req.body;

    // Validation - Check if any field is empty
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if user already exists by username or email
    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    // Check for uploaded avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Upload avatar to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // Create user object and store in the database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        email,
        password,
        username: username.toLowerCase()
    });

    // Remove sensitive fields from response
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    // Check if user creation was successful
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    // Return successful response
    return res.status(201).json(new ApiResponse(200, createdUser, "User registered successfully"));
});

// Controller function to handle user login
const loginUser = asyncHandler(async (req, res) => {
    // Extract username/email and password from request body
    const { email, username, password } = req.body;

    // Validate username/email presence
    if (!(username || email)) {
        throw new ApiError(400, "Username or email is required");
    }

    // Find user by username/email
    const user = await User.findOne({ $or: [{ username }, { email }] });

    // If user not found, throw error
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // Validate password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Incorrect password");
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // Retrieve logged in user data
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    // Set cookies and send response
    const options = {
        httpOnly: true,
        secure: true
    };

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"));
});

// Controller function to handle user logout
const logoutUser = asyncHandler(async (req, res) => {
    // Remove refresh token from the user document
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    );

    // Clear cookies and send response
    const options = {
        httpOnly: true,
        secure: true
    };
    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, "User Logged Out Successfully"));
});

// Controller function to refresh access token using refresh token
const refreshAccessToken = asyncHandler(async (req, res) => {
    // Get refresh token from request cookies or body
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    // If refresh token is missing, unauthorized request
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        // Verify refresh token
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const user = await User.findById(decodedToken?._id);

        // If user or refresh token is invalid, throw error
        if (!user || incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invalid refresh token");
        }

        // Generate new access and refresh tokens
        const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        // Set cookies and send response
        const options = {
            httpOnly: true,
            secure: true
        };
        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed successfully"));
    } catch (error) {
        // Handle token verification errors
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

// Controller function to change user password
const changeCurrentPassword = asyncHandler(async (req, res) => {
    // Extract old and new passwords from request body
    const { oldPassword, newPassword } = req.body;

    // Find user by ID
    const user = await User.findById(req.user?._id);
    // Check if old password is correct
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    // Update password and save user
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    // Send success response
    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

// Controller function to get current logged in user details
const getCurrentUser = asyncHandler(async (req, res) => {
    // Return current user details
    return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// Controller function to update user account details
const updateAccountDetails = asyncHandler(async (req, res) => {
    // Extract updated full name and email from request body
    const { fullName, email } = req.body;

    // Check if any field is missing
    if (!(fullName || email)) {
        throw new ApiError(400, "All fields are required");
    }

    // Update user account details
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { fullName, email } },
        { new: true } // Return updated document
    ).select("-password");

    // Send success response
    return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"));
});

// Controller function to update user avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
    // Extract avatar path from request file
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    // Upload avatar to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar");
    }

    // Update user avatar URL and retrieve updated user data
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password");

    // Send success response
    return res.status(200).json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

// Controller function to update user cover image
const updateUserCoverImage = asyncHandler(async (req, res) => {
    // Extract cover image path from request file
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing");
    }

    // Upload cover image to Cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading cover image");
    }

    // Update user cover image URL and retrieve updated user data
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { coverImage: coverImage.url } },
        { new: true }
    ).select("-password");

    // Send success response
    return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                iSubscribed: {
                    $cond: {
                        $if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                iSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "User channel fetched successfully")
        )


})

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        )
})





// Export controller functions
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};
