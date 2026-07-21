/**
 * ONE-TIME migration: assign an ownerId to all existing records that don't have one.
 *
 * Use this ONLY if you already had data in the DB before adding multi-owner support.
 * Fresh installs do NOT need this.
 *
 * Usage:
 *   node scripts/migrate-owner.js <ownerMobile>
 *   e.g.  node scripts/migrate-owner.js 9876543210
 *
 * It finds the owner User by mobile, then stamps that ownerId onto every
 * Flat / Tenant / RentPayment / Expense / ElectricityBill / Document that is
 * missing one, plus every tenant login User.
 */
require("dotenv").config();
const mongoose = require("mongoose");

const User = require("../src/models/User");
const Flat = require("../src/models/Flat");
const Tenant = require("../src/models/Tenant");
const RentPayment = require("../src/models/RentPayment");
const Expense = require("../src/models/Expense");
const ElectricityBill = require("../src/models/ElectricityBill");
const Document = require("../src/models/Document");

const run = async () => {
  const mobile = process.argv[2];
  if (!mobile) {
    console.error("Usage: node scripts/migrate-owner.js <ownerMobile>");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const owner = await User.findOne({ mobile, role: "owner" });
  if (!owner) {
    console.error(`No owner found with mobile ${mobile}. Register the owner first.`);
    process.exit(1);
  }
  const ownerId = owner._id;
  console.log(`Assigning ownerId ${ownerId} to all orphan records...`);

  const orphan = { ownerId: { $exists: false } };
  const orphanOrNull = { $or: [{ ownerId: { $exists: false } }, { ownerId: null }] };

  const collections = [
    ["Flat", Flat, orphan],
    ["Tenant", Tenant, orphan],
    ["RentPayment", RentPayment, orphan],
    ["Expense", Expense, orphan],
    ["ElectricityBill", ElectricityBill, orphan],
    ["Document", Document, orphan],
    // tenant login accounts that have no owner yet
    ["User(tenant)", User, { role: "tenant", ...orphanOrNull }],
  ];

  for (const [label, Model, filter] of collections) {
    const r = await Model.updateMany(filter, { $set: { ownerId } });
    console.log(`  ${label}: matched ${r.matchedCount}, modified ${r.modifiedCount}`);
  }

  console.log("Migration done.");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((e) => {
  console.error("Migration failed:", e);
  process.exit(1);
});
