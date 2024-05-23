import { Request, Response, Router } from "express";
import { validateRequest } from "zod-express-middleware";
import { prisma } from "../../prisma/db.setup";
import bcrypt from "bcrypt";

import {
  encryptPassword,
  createUserJwtToken,
  createTokenUserInfo,
  authenticationMiddleware,
} from "../utils/auth-utils";
import { z } from "zod";

const userRouter = Router();

userRouter.get("/", (req: Request, res: Response) => {
  res.render("index", {
    title: "Login",
    page: "login",

    messages: req.flash("loginMessage"),
  });
});

userRouter.get("/register", (req: Request, res: Response) => {
  res.render("index", {
    title: "Register",
    page: "register",

    messages: req.flash("loginMessage"),
  });
});

userRouter.post(
  "/login",
  validateRequest({
    body: z.object({
      email: z.string(),
      password: z.string(),
    }),
  }),
  async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (!user) {
      console.log("ERROR: No User Found. Signin Failed");
      req.flash("loginMessage", "No User Found");
      return res.redirect("/login");
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.hashedPassword
    );
    if (!isPasswordCorrect) {
      console.log("Error: Invalid Credentials. SignIn Failed");
      req.flash("loginMessage", "Invalid Credentials, please try again");
      return res.redirect("/login");
    }

    await prisma.user.update({
      data: {
        lastLogin: new Date().toISOString(),
      },
      where: {
        id: user.id,
      },
    });
    const userInfo = createTokenUserInfo(user);
    const token = createUserJwtToken(user);

    localStorage.setItem("user", JSON.stringify(token));

    if (userInfo.role !== "MEMBER") return res.redirect("/api/admin");
    return res.redirect("/shop");
  }
);

export { userRouter };
