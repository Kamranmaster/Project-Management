import mongoose,{Schema} from 'mongoose';
import { AvailalbeTaskStatus,TaskStutusEnum } from '../utils/constants';

const taskSchema=new Schema({
    title:{
        type:String,
        required:true,
        trim:true
    },
    description:String,

    project:{
        type:Schema.Types.ObjectId,
        ref:"Project",
        required:true
    },
    assignedTo:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    assignedBy:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    status:{
        types:String,
        enum:AvailalbeTaskStatus,
        default:TaskStutusEnum.TODO
    },
    attachements:{
        type:[{
            url:String,
            mimeType:String,
            size:Number
        }],
        default:[]
    }
},{timestamps:true});

export const Task=mongoose.model("Task",taskSchema);