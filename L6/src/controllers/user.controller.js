import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// To make these both tokens we need 'userId', that's why we pass 'userId' in this method.
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // save refreshToken in DB
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // res.status(200).json(
    //     {
    //         message: "ok"
    //     }
    // )

    // get user details from frontend
    // validation - not empty (validate that user not enter empty value)
    // check if user already exists or not by users's "username" and "email"
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response (because I don't want to give password and refresh token to user)
    // check for user creation
    // return res

    // get user details from frontend
    const { fullName, email, username, password } = req.body
    // console.log("email: ", email);

    // validation - not empty (validate that user not enter empty value)
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "") // 
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // check if user already exists or not by users's "username" and "email"
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // console.log(req.files);

    // check for images, check for avatar
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    // When user will not provide coverImage, at that time this error may be occur "TypeError: Cannot read properties of undefined (reading '0') ". To solve this error write below 3 lines of code.
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.lenght > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    // upload them to cloudinary, avatar
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    // create user object - create entry in db
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // remove password and refresh token field from response (because I don't want to give password and refresh token to user)
    const createdUser = await User.findById(user._id).select("-password -refreshToken")

    // check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong which registering the user")
    }

    // return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    // take 'data' from 'req body'
    // username or email
    // find the user
    // password check
    // send cookies

    // --> take 'data' from 'req body'

    const { email, username, password } = req.body

    if (!(username || email)) {
        throw new ApiError(400, "username or email is required")
    }

    // --> // username or email

    // 'findOne' finds the first document in mongoDB and returns. In this case 'findOne' finds 'username' and 'email' then it will return.
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    // --> find the user

    // If user does not find with 'username' or 'email', then give error message
    if (!user) {
        throw new ApiError(404, "user does not exists")
    }

    // --> password check
    // Here, 'password' comes from 'req.body (which we defined early and top of the code)'
    const isPasswordValid = await user.isPasswordCorrect(password)

    // If password is incorrect
    if (!isPasswordValid) {
        throw new ApiError(401, "incorrect password")
    }

    // If password is correct then make access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // --> send cookies
    const options = {
        // By default anyone can modify cookies from frontend, but If we use 'httpOnly: true' and 'secure: true' it means that 'cookies' can not modify from frontend, It csn only be modify from server
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(new ApiResponse(200, {
        user: loggedInUser, accessToken, refreshToken
    },
        "User logged in successfully"
    ))

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined // cookies removed
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(new ApiResponse(200, "User Logged Out Successfully"))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken // If user is using mobile app then we have to use 'req.body.refreshToken'.

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

   try {
     const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
     )
 
     const user = await User.findById(decodedToken?._id)
 
     if (!user) {
         throw new ApiError(401, "Invalid refresh token")
     }
 
     if (incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401, "Refresh token is expired or used")
     }
 
     const options = {
         httpOnly: true,
         secure: true
     }
 
     const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id)
 
     return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", newRefreshToken, options).json(
         new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, "Access token refreshed successfully")
     )
   } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refres token")
   }




})

export { registerUser, loginUser, logoutUser, refreshAccessToken }