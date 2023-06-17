// Importing necessary dependencies and models for handling ordersimport express from "express";
import expressAsyncHandler from "express-async-handler";
import Order from "../models/orderModel.js";
import User from "../models/userModel.js";
import Product from "../models/productModel.js";
import { isAuth, isAdmin, mailgun, payOrderEmailTemplate } from "../utils.js";

// Creating an instance of the Express router for handling order-related routes
const orderRouter = express.Router();

// GET route for retrieving all orders. Restricted to authenticated admin users.
orderRouter.get(
  "/",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    // Find all orders and populate the "user" field with the "name" property
    const orders = await Order.find().populate("user", "name");
    res.send(orders);
  })
);
// POST route for creating a new order. Restricted to authenticated users.
orderRouter.post(
  "/",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // Create a new order object with the provided request data
    const newOrder = new Order({
      orderItems: req.body.orderItems.map((x) => ({ ...x, product: x._id })),
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
      itemsPrice: req.body.itemsPrice,
      shippingPrice: req.body.shippingPrice,
      taxPrice: req.body.taxPrice,
      totalPrice: req.body.totalPrice,
      user: req.user._id,
    });

    // Save the new order to the database
    const order = await newOrder.save();
    res.status(201).send({ message: "New Order Created", order });
  })
);

// GET route for retrieving order summary statistics. Restricted to authenticated admin users.
orderRouter.get(
  "/summary",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    // Aggregate queries to calculate various order, user, and product statistics
    const orders = await Order.aggregate([
      {
        $group: {
          _id: null,
          numOrders: { $sum: 1 },
          totalSales: { $sum: "$totalPrice" },
        },
      },
    ]);
    const users = await User.aggregate([
      {
        $group: {
          _id: null,
          numUsers: { $sum: 1 },
        },
      },
    ]);
    const dailyOrders = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          orders: { $sum: 1 },
          sales: { $sum: "$totalPrice" },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const productCategories = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);
    // Send the retrieved statistics as a response
    res.send({ users, orders, dailyOrders, productCategories });
  })
);

// GET route for retrieving orders of the current user. Restricted to authenticated users.
orderRouter.get(
  "/mine",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // Find orders that belong to the current user
    const orders = await Order.find({ user: req.user._id });
    res.send(orders);
  })
);

// GET route for retrieving a specific order by its ID. Restricted to authenticated users.
orderRouter.get(
  "/:id",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // Find the order with the specified ID
    const order = await Order.findById(req.params.id);
    if (order) {
      res.send(order);
    } else {
      res.status(404).send({ message: "Order Not Found" });
    }
  })
);

// PUT route for updating the delivery status of an order. Restricted to authenticated users.
orderRouter.put(
  "/:id/deliver",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // Find the order with the specified ID
    const order = await Order.findById(req.params.id);
    if (order) {
      // Update the delivery status and set the deliveredAt timestamp to the current time
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      await order.save();
      res.send({ message: "Order Delivered" });
    } else {
      res.status(404).send({ message: "Order Not Found" });
    }
  })
);

// PUT route for updating the payment status of an order. Restricted to authenticated users.
orderRouter.put(
  "/:id/pay",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // Find the order with the specified ID and populate the "user" field with the "email" and "name" properties
    const order = await Order.findById(req.params.id).populate(
      "user",
      "email name"
    );
    if (order) {
      // Update the payment status and set the paidAt timestamp to the current time
      order.isPaid = true;
      order.paidAt = Date.now();
      // Update the paymentResult with the provided request data
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
      };

      // Save the updated order to the database
      const updatedOrder = await order.save();
      // Send an email notification to the user about the payment
      mailgun()
        .messages()
        .send(
          {
            from: "Fashion Stylist <Stylist@mg.hbhstylist.com>",
            to: `${order.user.name} <${order.user.email}>`,
            subject: `New order ${order._id}`,
            html: payOrderEmailTemplate(order),
          },
          (error, body) => {
            if (error) {
              console.log(error);
            } else {
              console.log(body);
            }
          }
        );

      res.send({ message: "Order Paid", order: updatedOrder });
    } else {
      res.status(404).send({ message: "Order Not Found" });
    }
  })
);

// DELETE route for deleting an order. Restricted to authenticated admin users.
orderRouter.delete(
  "/:id",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    // Find the order with the specified ID
    const order = await Order.findById(req.params.id);
    if (order) {
      // Remove the order from the database
      await order.remove();
      res.send({ message: "Order Deleted" });
    } else {
      res.status(404).send({ message: "Order Not Found" });
    }
  })
);

// Export the orderRouter for use in other modules
export default orderRouter;
