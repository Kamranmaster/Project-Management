import mongoose,{Schema} from 'mongoose';
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema = new Schema(
    {
        avatar: {
            type: {
            url: String,
            localPath: String,
            },
            default: {
            url: `https://placehold.co/200x200`,
            localPath: "",
            },
        },
        username:{
            type:String,
            reqired:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true
        },
        email:{
            type:String,
            required:true,
            uniques:true,
            lowercase:true,
            trim:true
        },
        FullName:{
            type:String,
            trim:true
        },
        password:{
            type:String,
            required:[true,"Password is required"]
        },
        isEmailVerified:{
            type:Boolean,
            default:false
        },
        refreshToken:{
            type:String
        },
        forgotPasswordToken:{
            type:String
        },
        forgotPasswordTokenExpiry:{
            type:Date
        },
        emailVerificationToken:{
            type:String
        },
        emailVerificationTokenExpiry:{
            type:Date
        }
    },{
        timestamps:true,
    },
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    this.password=await bcrypt.hash(this.password, 10);
});

userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
            _id:this._id,
            email:this.email
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn:process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            _id:this._id
        },

        process.env.REFRESH_TOKEN_SECRET,{
            expiresIn:process.env.REFRESH_TOKEN_EXPIRY
        }
    )
};

userSchema.methods.generateTemporaryToken=function(){
    const unHashedToken=crypto.randomBytes(20).toString("hex");

    const hashedToken=crypto
        .createHash("sha256")
        .update(unHashedToken)
        .digest("hex")

        const tokenExpiry=Date.now()+(20*60*1000) //20min

        return { unHashedToken, hashedToken, tokenExpiry };
};

export const User=mongoose.model('User',userSchema)

