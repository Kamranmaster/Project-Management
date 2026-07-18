import {body} from "express-validator";

import { AvailalbeUserRole } from "../utils/constants.js";

const userRegisterValidator=()=>{
    return [
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),

        body("username")
            .trim()
            .notEmpty()
            .withMessage("Usernam is required")
            .isLowercase()
            .withMessage("Username must be in lowercase")
            .isLength({min:3})
            .withMessage("Username must be at least 3 character long"),

        body("password")
            .trim()
            .notEmpty()
            .withMessage("Password is reqired"),

        body("fullname")
            .optional()
            .trim()
             


    ]
}

const userLoginValidator=()=>{
    return [
        body("email")
            .optional()
            .isEmail()
            .withMessage("Email is invalid"),
        
        body("password")
            .notEmpty()
            .withMessage("Password is reqired")

    ];
}

const userChangeCurrentPasswordValidator=()=>{
    return [
        body("oldPassword")
            .notEmpty()
            .withMessage("Old password is required"),
        body("newPassword")
            .notEmpty()
            .withMessage("New passwor is required")
    ];
}

const userForgotPasswordValidator=()=>{
    return [
        body("email")
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
    ];
}
const userResetForgotPasswordValidator=()=>{
    return [
        body("newPassword")
            .notEmpty()
            .withMessage("New password is required")
            
    ];
}

const createProjectValidator=()=>{
    return [
        body("name")
            .notEmpty()
            .withMessage("Namr id required"),
        body("description").optional()
        
    ]
}

const addMembertoProjectorValidator=()=>{
    return [
        body("email")
            .trim()
            .notEmpty()
            .withMessage("Email is required")
            .isEmail()
            .withMessage("Email is invalid"),
        
        body("role")
            .notEmpty()
            .withMessage("Role is required")
            .isIn(AvailalbeUserRole)
            .withMessage("Role is invalid")
    ]
}



export {
  userRegisterValidator,
  userLoginValidator,
  userChangeCurrentPasswordValidator,
  userForgotPasswordValidator,
  userResetForgotPasswordValidator,
  createProjectValidator,
  addMembertoProjectorValidator,
};
