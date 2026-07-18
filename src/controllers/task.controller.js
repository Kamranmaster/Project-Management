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
    const {projectId}=req.params

    const projects=await Project.findById(projectId)

    if(!projects){
        throw new ApiError(404,"project not found")
    }

    const task=await Task.find({
        project:new mongoose.Types.ObjectId(projectId)
    }).populate("assignedTo","avatar name fullname")

    return res
        .status(200)
        .json(
            new ApiResponse(200,task,"Tasks fetched successfully")
        )
})

const createTask=asyncHandler(async(req,res)=>{
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
        .json(new ApiResponse(201,task,"Task created successfully"))
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
                from:"users",
                localField:"assignedTo",
                foreignField:"_id",
                as:"assignedTo",
                pipeline:[
                    {
                        $project:{
                            _id:1,
                            username:1,
                            FullName:1,
                            avatar:1,
                            email:1
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"assignedBy",
                foreignField:"_id",
                as:"assignedBy",
                pipeline:[
                    {
                        $project:{
                            _id:1,
                            username:1,
                            FullName:1,
                            avatar:1
                        }
                    }
                ]
            }
        },
        {
            $lookup:{
                from:"subtasks",
                localField:"_id",
                foreignField:"task",
                as:"subtasks",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"createdBy",
                            foreignField:"_id",
                            as:"createdBy",
                            pipeline:[
                                {
                                    $project:{
                                        _id:1,
                                        username:1,
                                        FullName:1,
                                        avatar:1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            createdBy:{
                                $arrayElemAt:["$createdBy",0]
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields:{
                assignedTo:{
                    $arrayElemAt:["$assignedTo",0]
                },
                assignedBy:{
                    $arrayElemAt:["$assignedBy",0]
                }
            }
        }
    ])

    if(!task || task.length===0){
        throw new ApiError(404,"Task not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200,task[0],"Task fetched successfully"))
})

const updateTask=asyncHandler(async(req,res)=>{
    const {taskId}=req.params
    const {title,description,status,assignedTo}=req.body

    const task=await Task.findById(taskId)

    if(!task){
        throw new ApiError(404,"Task not found")
    }

    if(title) task.title=title
    if(description!==undefined) task.description=description
    if(status) task.status=status
    if(assignedTo) task.assignedTo=new mongoose.Types.ObjectId(assignedTo)

    //handle new file attachments if any
    const files=req.files||[]

    if(files.length>0){
        const newAttachements=files.map(file=>{
            return {
                url:`${process.env.SERVER_URL}/images/${file.originalname}`,
                mimetype:file.mimetype,
                size:file.size
            }
        })
        task.attachements=[...task.attachements,...newAttachements]
    }

    await task.save({validateBeforeSave:false})

    return res
        .status(200)
        .json(new ApiResponse(200,task,"Task updated successfully"))
})

const deleteTask=asyncHandler(async(req,res)=>{
    const {taskId}=req.params

    const task=await Task.findByIdAndDelete(taskId)

    if(!task){
        throw new ApiError(404,"Task not found")
    }

    //delete all subtasks associated with this task
    await Subtask.deleteMany({task:new mongoose.Types.ObjectId(taskId)})

    return res
        .status(200)
        .json(new ApiResponse(200,task,"Task and its subtasks deleted successfully"))
})

const createSubTask=asyncHandler(async(req,res)=>{
    const {title}=req.body
    const {taskId}=req.params

    const task=await Task.findById(taskId)

    if(!task){
        throw new ApiError(404,"Task not found")
    }

    const subtask=await Subtask.create({
        title,
        task:new mongoose.Types.ObjectId(taskId),
        isCompleted:false,
        createdBy:new mongoose.Types.ObjectId(req.user._id)
    })

    return res
        .status(201)
        .json(new ApiResponse(201,subtask,"Subtask created successfully"))
})

const updateSubTask=asyncHandler(async(req,res)=>{
    const {subTaskId}=req.params
    const {title,isCompleted}=req.body

    const subtask=await Subtask.findById(subTaskId)

    if(!subtask){
        throw new ApiError(404,"Subtask not found")
    }

    if(title) subtask.title=title
    if(isCompleted!==undefined) subtask.isCompleted=isCompleted

    await subtask.save({validateBeforeSave:false})

    return res
        .status(200)
        .json(new ApiResponse(200,subtask,"Subtask updated successfully"))
})

const deleteSubTask=asyncHandler(async(req,res)=>{
    const {subTaskId}=req.params

    const subtask=await Subtask.findByIdAndDelete(subTaskId)

    if(!subtask){
        throw new ApiError(404,"Subtask not found")
    }

    return res
        .status(200)
        .json(new ApiResponse(200,subtask,"Subtask deleted successfully"))
})

export{
    createSubTask,
    createTask,
    deleteTask,
    deleteSubTask,
    updateTask,
    updateSubTask,
    getTasks,
    getTasksById
}
