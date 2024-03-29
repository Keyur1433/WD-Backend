import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"; // Here "fs" means "filesystem"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null

        //uplod the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        //if file has been uploaded successfully then console log
        console.log("file is uploaded in cloudinary", response.url);
        // fs.unlinkSync(localFilePath)
        return response; 

    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operation got failed
        return null;
    }
}

export {uploadOnCloudinary}