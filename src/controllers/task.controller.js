import {Project} from "../models/project.models.js";
import { Task} from "../models/task.models.js";
import { Subtask } from "../models/subtask.model.js";
import { ProjectMember } from "../models/projectmember.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handles.js";
import { ApiError } from "../utils/api-error.js";
import mongoose from "mongoose"
import { AvailalbeTaskStatus } from "../utils/constants.js";

// Multer stores files as public/images/<timestamp>-<originalname>, which express.static serves at /images
const toAttachments=(req,files)=>{
    const baseUrl=process.env.SERVER_URL || `${req.protocol}://${req.get("host")}`

    return files.map(file=>{
        return {
            url:`${baseUrl}/images/${file.filename}`,
            mimeType:file.mimetype,
            size:file.size
        }
    })
}

// Tasks can only be assigned to members of the same project
const ensureAssigneeIsMember=async(projectId,assignedTo)=>{
    const isMember=await ProjectMember.exists({
        project:new mongoose.Types.ObjectId(projectId),
        user:new mongoose.Types.ObjectId(assignedTo)
    })

    if(!isMember){
        throw new ApiError(400,"Assignee must be a member of this project")
    }
}

const ensureValidStatus=(status)=>{
    if(!AvailalbeTaskStatus.includes(status)){
        throw new ApiError(400,"Invalid task status")
    }
}

// Every task/subtask lookup is scoped to :projectId so membership in one
// project can't be used to read or modify another project's data.
const findProjectTask=(projectId,taskId)=>{
    return Task.findOne({
        _id:new mongoose.Types.ObjectId(taskId),
        project:new mongoose.Types.ObjectId(projectId)
    })
}

const findProjectSubtask=async(projectId,subTaskId)=>{
    const subtask=await Subtask.findById(subTaskId)

    if(!subtask){
        throw new ApiError(404,"Subtask not found")
    }

    const task=await findProjectTask(projectId,subtask.task)

    if(!task){
        throw new ApiError(404,"Subtask not found")
    }

    return subtask
}

const getTasks=asyncHandler(async(req,res)=>{
    const {projectId}=req.params

    const projects=await Project.findById(projectId)

    if(!projects){
        throw new ApiError(404,"project not found")
    }

    const tasks=await Task.find({
        project:new mongoose.Types.ObjectId(projectId)
    })
        .populate("assignedTo","username FullName avatar email")
        .sort({createdAt:-1})
        .lean()

    // Subtask progress for the board cards, computed in one query
    const subtaskCounts=await Subtask.aggregate([
        {
            $match:{
                task:{$in:tasks.map(task=>task._id)}
            }
        },
        {
            $group:{
                _id:"$task",
                total:{$sum:1},
                completed:{$sum:{$cond:["$isCompleted",1,0]}}
            }
        }
    ])

    const countsByTask=new Map(subtaskCounts.map(count=>[String(count._id),count]))

    const task=tasks.map(task=>{
        const counts=countsByTask.get(String(task._id))
        return {
            ...task,
            subtaskCount:counts?.total || 0,
            completedSubtaskCount:counts?.completed || 0
        }
    })

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

    if(assignedTo){
        await ensureAssigneeIsMember(projectId,assignedTo)
    }

    if(status){
        ensureValidStatus(status)
    }

    const attachements=toAttachments(req,req.files||[])

    const task=await Task.create({
        title,
        description,
        project:new mongoose.Types.ObjectId(projectId),
        assignedTo:assignedTo ? new mongoose.Types.ObjectId(assignedTo):undefined,
        assignedBy:new mongoose.Types.ObjectId(req.user._id),
        status:status || undefined,
        attachements
    })

    return res
        .status(201)
        .json(new ApiResponse(201,task,"Task created successfully"))
})

const getTasksById=asyncHandler(async(req,res)=>{
    const {projectId,taskId}=req.params

    const task=await Task.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(taskId),
                project:new mongoose.Types.ObjectId(projectId)
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
                        $sort:{
                            createdAt:1
                        }
                    },
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
    const {projectId,taskId}=req.params
    const {title,description,status,assignedTo}=req.body

    const task=await findProjectTask(projectId,taskId)

    if(!task){
        throw new ApiError(404,"Task not found")
    }

    if(title) task.title=title
    if(description!==undefined) task.description=description
    if(status){
        ensureValidStatus(status)
        task.status=status
    }

    // assignedTo: "" (or null) unassigns, an id reassigns, omitted leaves it unchanged
    if(assignedTo!==undefined){
        if(assignedTo){
            await ensureAssigneeIsMember(projectId,assignedTo)
            task.assignedTo=new mongoose.Types.ObjectId(assignedTo)
        }else{
            task.assignedTo=undefined
        }
    }

    //handle new file attachments if any
    const files=req.files||[]

    if(files.length>0){
        task.attachements=[...task.attachements,...toAttachments(req,files)]
    }

    await task.save({validateBeforeSave:false})

    return res
        .status(200)
        .json(new ApiResponse(200,task,"Task updated successfully"))
})

const deleteTask=asyncHandler(async(req,res)=>{
    const {projectId,taskId}=req.params

    const task=await Task.findOneAndDelete({
        _id:new mongoose.Types.ObjectId(taskId),
        project:new mongoose.Types.ObjectId(projectId)
    })

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
    const {projectId,taskId}=req.params

    const task=await findProjectTask(projectId,taskId)

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
    const {projectId,subTaskId}=req.params
    const {title,isCompleted}=req.body

    const subtask=await findProjectSubtask(projectId,subTaskId)

    if(title) subtask.title=title
    if(isCompleted!==undefined) subtask.isCompleted=isCompleted===true || isCompleted==="true"

    await subtask.save({validateBeforeSave:false})

    return res
        .status(200)
        .json(new ApiResponse(200,subtask,"Subtask updated successfully"))
})

const deleteSubTask=asyncHandler(async(req,res)=>{
    const {projectId,subTaskId}=req.params

    const subtask=await findProjectSubtask(projectId,subTaskId)

    await subtask.deleteOne()

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
