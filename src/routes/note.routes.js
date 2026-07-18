import { Router } from "express";
import {
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
} from "../controllers/note.controller.js";
import { validate } from "../middlewares/validator.middleware.js";

import { createNoteValidator } from "../validators/index.js";

import { verifyJWT, validateProjectPermission } from "../middlewares/auth.middleware.js";
import { AvailalbeUserRole, UserRolesEnum } from "../utils/constants.js";

const router = Router();

router.use(verifyJWT);

router
  .route("/:projectId")
  .get(validateProjectPermission(AvailalbeUserRole), getNotes)
  .post(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    createNoteValidator(),
    validate,
    createNote
  );

router
  .route("/:projectId/n/:noteId")
  .get(validateProjectPermission(AvailalbeUserRole), getNoteById)
  .put(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    createNoteValidator(),
    validate,
    updateNote
  )
  .delete(
    validateProjectPermission([UserRolesEnum.ADMIN]),
    deleteNote
  );

export default router;
