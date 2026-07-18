import { User } from "../models/user.models.js";
import {Project} from "../models/project.models.js";
import { Task} from "../models/task.models.js";
import { Subtask } from "../models/subtask.model.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handles.js";
import { ApiError } from "../utils/api-error.js";
import mongoose from "mongoose" 
import { AvailalbeUserRole, UserRolesEnum } from "../utils/constants.js";

const getTasks=asyncHandler(async(req,res)=>{
    //test
    const {projectId}=req.params

    const projects=await Project.findById(projectId)

    if(!projects){
        throw new ApiError(404,"project not found")
    }

    const task=await Task.find({
        project:new mongoose.Types.ObjectId(projectId)
    }).populate("assignedTo","avatar name fullname")

    return res
        .status(202)
        .json(
            new ApiResponse(202,task,{message:"Tasks fetched successfully"})
        )
})
const createTask=asyncHandler(async(req,res)=>{
    //test
    const {title,description,assignedTo,status}=req.body
    const {projectId}=req.params

    const project=await Project.findById(projectId)

    if(!project){
        throw new ApiError(404,"project not found")
    }

    const files=req.files||[]

    const attachements=files.map(file=>{
        return {
            url:`${process.env.SERVER_URL}/images/${file.originalname}`,

            mimetype:file.mimetype,
            size:file.size
        }
    })

    const task=await Task.create({
        title,
        description,
        project:new mongoose.Types.ObjectId(projectId),
        assignedTo:assignedTo ? new mongoose.Types.ObjectId(assignedTo):undefined,
        assignedBy:new mongoose.Types.ObjectId(req.user._id),
        attachements
    })

    return res
        .status(201)
        .json(new ApiResponse(201,task,{message:"Task created successfully"}))
})

const getTasksById=asyncHandler(async(req,res)=>{
    const {taskId}=req.params
    const task=await Task.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(taskId)
            }
        },
        {
            $lookup:{
                
            }
        }
    ])
})
const updateTask=asyncHandler(async(req,res)=>{
    //test
})
const deleteTask=asyncHandler(async(req,res)=>{
    //test
})
const createSubTask=asyncHandler(async(req,res)=>{})
const updateSubTask=asyncHandler(async(req,res)=>{})
const deleteSubTask=asyncHandler(async(req,res)=>{
    //test
})

export{
    createSubTask,
    createTask,
    deleteTask,
    deleteSubTask,
    updateTask,
    updateSubTask,
    getTasks

}
