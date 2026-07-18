import { Router } from "express";
import {
  getTasks,
  getTasksById,
  createTask,
  updateTask,
  deleteTask,
  createSubTask,
  updateSubTask,
  deleteSubTask,
} from "../controllers/task.controller.js";
import { validate } from "../middlewares/validator.middleware.js";

import {
  createTaskValidator,
  createSubTaskValidator,
} from "../validators/index.js";

import { verifyJWT, validateProjectPermission } from "../middlewares/auth.middleware.js";
import { AvailalbeUserRole, UserRolesEnum } from "../utils/constants.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyJWT);

router
  .route("/:projectId")
  .get(validateProjectPermission(AvailalbeUserRole), getTasks)
  .post(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,
    ]),
    upload.array("attachements", 5),
    createTaskValidator(),
    validate,
    createTask
  );

router
  .route("/:projectId/t/:taskId")
  .get(validateProjectPermission(AvailalbeUserRole), getTasksById)
  .put(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,
    ]),
    upload.array("attachements", 5),
    updateTask
  )
  .delete(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,
    ]),
    deleteTask
  );

router
  .route("/:projectId/t/:taskId/subtasks")
  .post(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,
    ]),
    createSubTaskValidator(),
    validate,
    createSubTask
  );

router
  .route("/:projectId/st/:subTaskId")
  .put(
    validateProjectPermission(AvailalbeUserRole),
    updateSubTask
  )
  .delete(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,
    ]),
    deleteSubTask
  );

export default router;
