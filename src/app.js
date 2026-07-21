// Express application setup
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Rent Manager API is running" });
});

// API routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/flats", require("./routes/flatRoutes"));
app.use("/api/tenants", require("./routes/tenantRoutes"));
app.use("/api/rent", require("./routes/rentRoutes"));
app.use("/api/expenses", require("./routes/expenseRoutes"));
app.use("/api/electricity", require("./routes/electricityRoutes"));
app.use("/api/dashboard", require("./routes/dashboardRoutes"));
app.use("/api/uploads", require("./routes/uploadRoutes"));
app.use("/api/documents", require("./routes/documentRoutes"));

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

module.exports = app;
