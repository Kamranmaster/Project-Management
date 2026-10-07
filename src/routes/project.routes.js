import { Router } from "express";
import {
  getProjects,
  getProjectsId,
  getProjectMembers,
  createProject,
  updateProject,
  deleteProject,
  addMembersToProject,
  updateMemberRole,
  deleteMember,
} from "../controllers/project.controller.js";
import {
  validate
} from "../middlewares/validator.middleware.js";

import {
  createProjectValidator,
  addMembertoProjectorValidator,
} from "../validators/index.js";

import { verifyJWT,validateProjectPermission } from "../middlewares/auth.middleware.js";
import { AvailalbeUserRole, UserRolesEnum } from "../utils/constants.js";


const router=Router();

router.use(verifyJWT);

router
    .route("/")
    .get(getProjects)
    .post(createProjectValidator(), validate, createProject);

router
  .route("/:projectId")
  .get(validateProjectPermission(AvailalbeUserRole), getProjectsId)
  .put(
    validateProjectPermission([
      UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,
    ]),
    createProjectValidator(),
    validate,
    updateProject,
  )
  .delete(validateProjectPermission([UserRolesEnum.ADMIN]), deleteProject);

router
  .route("/:projectId/members")
  .get(validateProjectPermission(AvailalbeUserRole), getProjectMembers)
  .post(
    validateProjectPermission([UserRolesEnum.ADMIN,
      UserRolesEnum.PROJECT_ADMIN,]),addMembertoProjectorValidator(),validate,
    addMembersToProject
  )

router
    .route("/:projectId/members/:userId")
    .put(validateProjectPermission([UserRolesEnum.ADMIN]),validate,updateMemberRole)
    .delete(validateProjectPermission([UserRolesEnum.ADMIN]),validate,deleteMember)

export default router;