import mongoose,{Schema} from 'mongoose';


import {AvailalbeTaskStatus,AvailalbeUserRole,UserRolesEnum} from "../utils/constants.js";

const projectMemberSchema = new Schema({
    user:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true

    },
    project:{
        type:Schema.type.ObjectId,
        ref:"Project",
        required:true
    },
    role:{
        type:String,
        enum:AvailalbeUserRole,
        default:UserRolesEnum.MEMEBER
    }
},{timestamps:true});
