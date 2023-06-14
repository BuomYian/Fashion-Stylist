// Importing required modules and libraries
import http from "http";
import { Server } from "socket.io";
import express from "express";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import seedRouter from "./routes/seedRoutes.js";
import productRouter from "./routes/productRoutes.js";
import userRouter from "./routes/userRoutes.js";
import orderRouter from "./routes/orderRoutes.js";
import uploadRouter from "./routes/uploadRoutes.js";
import Chapa from "chapa";

let mychapa = new Chapa("CHASECK_TEST-gnHNo64R7XyxYKr17E10xGrnRGtirQvU");

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

// Chapa integration
app.post("/api/keys/paywithchapa", async (req, res) => {
  const form_data = req.body;
  const customerInfo = {
    first_name: "John",
    last_name: "Doe",
    email: "john@gmail.com",
    currency: "USD",
    amount: "125",
    // tx_ref: tx_ref,
    callback_url: "https://example.com/callbackurl",
    return_url: "http://localhost:3000",
  };

  mychapa
    .initialize(customerInfo, { autoRef: true })
    .then((response) => {
      console.log(response);
      res.send(response);
    })
    .catch((err) => {
      console.log("error", err);
      res.status(400).send(err);
    });
});

app.get("/verify", async (req, res) => {
  mychapa
    .verify("590a4327-fbd2-4665-8ddb-a201e78f4606")
    .then((res) => {
      console.log(res);
    })
    .catch((err) => {
      console.log(err);
    });
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

// Chat with customer integration
const httpServer = http.Server(app);
const io = new Server(httpServer);
const users = [];

io.on("connection", (socket) => {
  socket.on("disconnect", () => {
    const user = users.find((x) => x.socketId === socket.id);
    if (user) {
      user.online = false;
      console.log("Offline", user.name);
      const admin = users.find((x) => x.isAdmin && x.online);
      if (admin) {
        io.to(admin.socketId).emit("updateUser", user);
      }
    }
  });
  socket.on("onLogin", (user) => {
    const updatedUser = {
      ...user,
      online: true,
      socketId: socket.id,
      message: [],
    };
    const existUser = users.find((x) => x._id === updatedUser._id);
    if (existUser) {
      existUser.socketId = socket.id;
      existUser.online = true;
    } else {
      users.push(updatedUser);
    }
    console.log("Online", user.name);
    const admin = users.find((x) => x.isAdmin && x.online);
    if (admin) {
      io.to(admin.socketId).emit("updateUser", updatedUser);
    }
    if (updatedUser.isAdmin) {
      io.to(updatedUser.socketId).emit("listUsers", users);
    }
  });
  socket.on("onUserSelected", (user) => {
    const admin = users.find((x) => x.isAdmin && x.online);
    if (admin) {
      const existUser = users.find((x) => x._id === user._id);
      io.to(admin.socketId).emit("Selecteduser", existUser);
    }
  });
  socket.on("onMessage", (message) => {
    if (message.isAdmin) {
      const user = users.find((x) => x._id === message._id && x.online);
      if (user) {
        io.to(user.socketId).emit("message", message);
        user.messages.push(message);
      }
    } else {
      const admin = users.find((x) => x.isAdmin && x.online);
      if (admin) {
        io.to(admin.socketId).emit("message", message);
        const user = users.find((x) => x._id === message._id && x.online);
        user.messages.push(message);
      } else {
        io.to(socket.id).emit("message", {
          name: "Admin",
          body: "Sorry, I am not online right now",
        });
      }
    }
  });
});

httpServer.listen(port, () => {
  console.log(`Server running at port: ${port}`);
});
// app.listen(port, () => {
//   console.log(`Server running at port: ${port}`);
// });
