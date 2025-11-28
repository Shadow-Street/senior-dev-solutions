const express = require("express");
const session = require("express-session");
const routes = require("./routes");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev_secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use("/api", routes);

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

module.exports = app;
