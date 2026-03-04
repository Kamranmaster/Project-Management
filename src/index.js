import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/database.js";

dotenv.config({
  path: "./.env",
});


const port = process.env.PORT || 3000;


connectDB()
  .then(()=>{
    app.listen(port, () => {
      console.log(`Example app listening on port http://localhost:${port}`);
    });

  })
  .catch((erorr)=>{
    console.error("MongoDB connection error",erorr)
    process.exit(1);
  })
