// Importing required modules and libraries
import express from "express";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import seedRouter from "./routes/seedRoutes.js";
import productRouter from "./routes/productRoutes.js";
import userRouter from "./routes/userRoutes.js";
import orderRouter from "./routes/orderRoutes.js";
import uploadRouter from "./routes/uploadRoutes.js";

// Loading environment variables from .env file
dotenv.config();

// Connecting to the MongoDB database
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("connected to db");
  })
  .catch((err) => {
    console.log(err.message);
  });

// Creating an instance of the Express application
const app = express();

// Parsing incoming requests with JSON payloads
app.use(express.json());

// Parsing incoming requests with URL-encoded payloads
app.use(express.urlencoded({ extended: true }));

// Route to retrieve PayPal client ID
app.get("/api/keys/paypal", (req, res) => {
  res.send(process.env.PAYPAL_CLIENT_ID || "sb");
});

// Route to retrieve Google API key
app.get("/api/keys/google", (req, res) => {
  res.send({ key: process.env.GOOGLE_API_KEY || "" });
});

// Route for handling file uploads
app.use("/api/upload", uploadRouter);

// Route for seeding data
app.use("/api/seed", seedRouter);

// Route for product-related operations
app.use("/api/products", productRouter);

// Route for user-related operations
app.use("/api/users", userRouter);

// Route for order-related operations
app.use("/api/orders", orderRouter);

// Serving static files from the frontend build directory
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, "/frontend/build")));

// Route for handling all other requests
app.get("*", (req, res) =>
  res.sendFile(path.join(__dirname, "/frontend/build/index.html"))
);

// Error handling middleware
app.use((err, req, res, next) => {
  res.status(500).send({ message: err.message });
});

// Starting the server
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running at port: ${port}`);
});
