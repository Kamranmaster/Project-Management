import { Project } from "../models/project.models.js";
import { ProjectNote } from "../models/note.models.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handles.js";
import { ApiError } from "../utils/api-error.js";
import mongoose from "mongoose";

// Notes are always looked up within their project so a member of one
// project can't read or modify another project's notes by id.
const projectNoteFilter = (projectId, noteId) => ({
  _id: new mongoose.Types.ObjectId(noteId),
  project: new mongoose.Types.ObjectId(projectId),
});

const getNotes = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const notes = await ProjectNote.find({
    project: new mongoose.Types.ObjectId(projectId),
  })
    .populate("createdBy", "username FullName avatar email")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, notes, "Notes fetched successfully"));
});

const getNoteById = asyncHandler(async (req, res) => {
  const { projectId, noteId } = req.params;

  const note = await ProjectNote.findOne(projectNoteFilter(projectId, noteId)).populate(
    "createdBy",
    "username FullName avatar email"
  );

  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, note, "Note fetched successfully"));
});

const createNote = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { projectId } = req.params;

  const project = await Project.findById(projectId);

  if (!project) {
    throw new ApiError(404, "Project not found");
  }

  const note = await ProjectNote.create({
    content,
    project: new mongoose.Types.ObjectId(projectId),
    createdBy: new mongoose.Types.ObjectId(req.user._id),
  });

  return res
    .status(201)
    .json(new ApiResponse(201, note, "Note created successfully"));
});

const updateNote = asyncHandler(async (req, res) => {
  const { projectId, noteId } = req.params;
  const { content } = req.body;

  const note = await ProjectNote.findOneAndUpdate(
    projectNoteFilter(projectId, noteId),
    { content },
    { new: true }
  );

  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, note, "Note updated successfully"));
});

const deleteNote = asyncHandler(async (req, res) => {
  const { projectId, noteId } = req.params;

  const note = await ProjectNote.findOneAndDelete(projectNoteFilter(projectId, noteId));

  if (!note) {
    throw new ApiError(404, "Note not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, note, "Note deleted successfully"));
});

export { getNotes, getNoteById, createNote, updateNote, deleteNote };
