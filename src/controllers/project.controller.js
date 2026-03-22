import { User } from "../models/user.models.js";
import {Project} from "../models/project.models.js";
import { ProjectMember} from "../models/projectmember.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handles.js";
import { ApiError } from "../utils/api-error.js";
import {
  sendEmail,
  emailVerificationMailgenContent,
  forgotPasswordMailgenContent,
} from "../utils/mail.js";

import mongoose from "mongoose" 
import { UserRolesEnum } from "../utils/constants.js";

//could add emial if user is added to a project


const getProjects= asyncHandler(async(req,res)=>{
  //test
})

const getProjectsId= asyncHandler(async(req,res)=>{
  //test
})

const createProject= asyncHandler(async(req,res)=>{
  const {name,description}=req.body

  const project=await Project.create({
    name,
    description,
    created_By: new mongoose.Types.ObjectId(req.user.id),
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
})

const updateMemberRole= asyncHandler(async(req,res)=>{
  //test
})

const deleteMember= asyncHandler(async(req,res)=>{
  //test
})

export {getProjects,getProjectsId,createProject,updateProject,deleteProject,addMembersToProject,updateMemberRole,deleteMember};

















