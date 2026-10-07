// Must be the first import: ES modules evaluate imports before this file's
// body, so app.js would otherwise read process.env before .env is loaded.
import "dotenv/config";
import app from "./app.js";
import connectDB from "./db/database.js";


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
