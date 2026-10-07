import { User } from "../models/user.models.js";
import {Project} from "../models/project.models.js";
import { ProjectMember} from "../models/projectmember.models.js";
import { Task } from "../models/task.models.js";
import { Subtask } from "../models/subtask.model.js";
import { ProjectNote } from "../models/note.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handles.js";
import { ApiError } from "../utils/api-error.js";
import {
  sendEmail,
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
} from "../utils/mail.js";

import mongoose from "mongoose" 
import { AvailalbeUserRole, UserRolesEnum } from "../utils/constants.js";

//could add emial if user is added to a project


const getProjects= asyncHandler(async(req,res)=>{
  //test

  const projects=await ProjectMember.aggregate([
      {
        $match:{
        user:new mongoose.Types.ObjectId(req.user.id)
      },
    },

      {
      $lookup:{
        from:"projects",
        localField:"project",
        foreignField:"_id",
        as:"projects",

        pipeline:[
          {
            $lookup:{
              from:"projectmembers",
              localField:"_id",
              foreignField:"project",
              as:"projectMembers"
            }
          },{
            $addFields:{
              members:{
                $size:"$projectMembers"
              }
            }
          }
        ]}
      },
      {
        $unwind:"$projects"
      },
      {
        $project:{
          projects:{
            _id:1,
            name:1,
            description:1,
            members:1,
            createdAt:1,
            createdBy:1
          },
          role:1,
          _id:0
        }
      }
        
      
    ]

  )
  
  return res
    .status(200)
    .json(new ApiResponse(
        200,
        projects,
        "Projects fetched successfully"
    ))
})

const getProjectsId= asyncHandler(async(req,res)=>{
  //test

  const {projectId}=req.params

  const project=await Project.findById(projectId)

  if(!project){
    throw new ApiError(404,"Project not found")
  }

  return res
    .status(200)
    .json(new ApiResponse(200,{...project.toObject(),role:req.user.role},"Project fetched successfully"))


})

const createProject= asyncHandler(async(req,res)=>{
  const {name,description}=req.body

  const project=await Project.create({
    name,
    description,
    createdBy: new mongoose.Types.ObjectId(req.user.id),
  });

  await ProjectMember.create({
    user:new mongoose.Types.ObjectId(req.user.id),
    project:new mongoose.Types.ObjectId(project._id),
    role:UserRolesEnum.ADMIN

  })

  return res
    .status(200)
    .json(new ApiResponse(200,project,{message:"Project created successfully"}))
})

const updateProject= asyncHandler(async(req,res)=>{
  //test

  const {name,description}=req.body
  const {projectId}=req.params

  const project=await Project.findByIdAndUpdate(projectId,{name,description},{new:true})

  if(!project){
     throw new ApiError(404,"Project not found")
  }

  return res
    .status(202)
    .json(new ApiResponse(
        200,
        project,
        {message:"Project updated successfully"}
    ))
})

const deleteProject= asyncHandler(async(req,res)=>{
  //test
  const {projectId}= req.params;

  const project=await Project.findByIdAndDelete(projectId);

  if(!project){
    throw new ApiError(404,"Project not found")
  }

  const projectObjectId=new mongoose.Types.ObjectId(projectId)
  const taskIds=await Task.find({project:projectObjectId}).distinct("_id")

  await Promise.all([
    ProjectMember.deleteMany({project:projectObjectId}),
    Subtask.deleteMany({task:{$in:taskIds}}),
    Task.deleteMany({project:projectObjectId}),
    ProjectNote.deleteMany({project:projectObjectId}),
  ])

  return res
    .status(202)
    .json(new ApiResponse(
      202,
      project,
      "Project deleted successfully"
    ))
})

const addMembersToProject= asyncHandler(async(req,res)=>{
  //test

  const {email,role}=req.body
  const {projectId}=req.params

  // project_admins may invite, but only admins can hand out the admin role
  if(role===UserRolesEnum.ADMIN && req.user.role!==UserRolesEnum.ADMIN){
    throw new ApiError(403,"Only admins can add other admins")
  }

  const user=await User.findOne({email}).select("_id username FullName email avatar")

  if(!user){
    throw new ApiError(404,"User not found")
  }

  const existingMember=await ProjectMember.findOne({
    user: new mongoose.Types.ObjectId(user._id),
    project: new mongoose.Types.ObjectId(projectId),
  })

  // Role changes go through PUT /members/:userId (admin only)
  if(existingMember){
    throw new ApiError(409,"User is already a member of this project")
  }

  await ProjectMember.create({
    user: new mongoose.Types.ObjectId(user._id),
    project: new mongoose.Types.ObjectId(projectId),
    role,
  });
  return res.status(201).json(new ApiResponse(201,user,"Member added successfully"))

})



const getProjectMembers= asyncHandler(async(req,res)=>{
  //test
  const {projectId}=req.params
  const project=await Project.findById(projectId)

  if(!project){
    throw new ApiError(404,"Project not found")
  }

  const projectMembers = await ProjectMember.aggregate([
    {
      $match:{
        project:new mongoose.Types.ObjectId(projectId)
      }
    },

    {
      $lookup:{
        from:"users",
        localField:"user",
        foreignField:"_id",
        as:"user",

        pipeline:[
          {
            $project:{
              _id:1,
              username:1,
              FullName:1,
              email:1,
              avatar:1
            }
          }
        ]
      }
    },
    {
      $addFields:{
        user:{
          $arrayElemAt:["$user",0]
        }
      }
    },
    {
      $project:{
        project:1,
        user:1,
        role:1,
        createdAt:1,
        updatedAt:1,
        _id:0

      }
    }

   
  ])
   return res
      .status(200)
      .json(
        new ApiResponse(200,projectMembers,"Project Memebers fetched successfully")
      )
})

// A project must always keep at least one admin, otherwise nobody can manage it
const ensureNotLastAdmin=async(projectId,userId)=>{
  const member=await ProjectMember.findOne({
    project:new mongoose.Types.ObjectId(projectId),
    user:new mongoose.Types.ObjectId(userId),
  })

  if(member?.role!==UserRolesEnum.ADMIN) return

  const adminCount=await ProjectMember.countDocuments({
    project:new mongoose.Types.ObjectId(projectId),
    role:UserRolesEnum.ADMIN,
  })

  if(adminCount<=1){
    throw new ApiError(400,"A project must have at least one admin")
  }
}

const updateMemberRole= asyncHandler(async(req,res)=>{
  //test
  const { projectId,userId}=req.params;
  const {newRole}  =req.body;

  if(!AvailalbeUserRole.includes(newRole)){
    throw new ApiError(400,"Invalid Role")
  }

  if(newRole!==UserRolesEnum.ADMIN){
    await ensureNotLastAdmin(projectId,userId)
  }

  const projectMember = await ProjectMember.findOneAndUpdate(
    {
      project: new mongoose.Types.ObjectId(projectId),
      user: new mongoose.Types.ObjectId(userId),
    },
    { role: newRole },
    { new: true },
  );

  if (!projectMember) {
    throw new ApiError(404, "Project member not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200,projectMember,{message:"Member role updated successfully"}))

})

const deleteMember= asyncHandler(async(req,res)=>{
  //test
  const {projectId,userId}=req.params;

  await ensureNotLastAdmin(projectId,userId)

  const projectMember=await ProjectMember.findOneAndDelete(
    {
    project:new mongoose.Types.ObjectId(projectId),
    user: new mongoose.Types.ObjectId(userId)
  },
  {
    new:true
  }
  )

  if(!projectMember){
    throw new ApiError(404,"Project member not found")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, projectMember, {
        message: "Member role deleted successfully",
      }),
    );
})

export {getProjects,getProjectsId,getProjectMembers,createProject,updateProject,deleteProject,addMembersToProject,updateMemberRole,deleteMember};

















