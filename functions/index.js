// functions/src/index.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * Cloud Function to update dashboard statistics whenever a work order changes.
 * This function triggers on any write (create, update, delete) to the work_orders collection.
 */
export const updateDashboardStats = functions.firestore
  .document("work_orders/{orderId}")
  .onWrite(async (change, context) => {
    console.log("Work order changed, updating dashboard stats...");

    // Get a reference to the work_orders collection
    const workOrdersRef = db.collection("work_orders");
    const snapshot = await workOrdersRef.get();

    let open = 0;
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;
    const now = new Date();

    // Loop through all work orders and calculate stats
    snapshot.forEach((doc) => {
      const order = doc.data();
      if (
        order.status === "Open" ||
        order.status === "Pending" ||
        order.status === "Scheduled" ||
        order.status === "In Progress"
      ) {
        open++;
      }
      if (order.status === "Completed") {
        completed++;
      }
      if (order.status === "In Progress") {
        inProgress++;
      }

      // Check for overdue orders
      if (order.dueDate) {
        // Firestore timestamps need to be converted to JS Date objects
        const dueDate = new Date(order.dueDate);
        if (order.status !== "Completed" && dueDate < now) {
          overdue++;
        }
      }
    });

    // Get total users count
    const usersSnapshot = await db.collection("users").get();
    const totalUsers = usersSnapshot.size;

    // Data to be saved in the summary document
    const stats = {
      openOrders: open,
      completedOrders: completed,
      inProgressOrders: inProgress,
      overdueOrders: overdue,
      totalUsers: totalUsers,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(), // Track when it was last updated
    };

    console.log("Calculated Stats:", stats);

    // Get a reference to the summary document and set the new stats
    const summaryRef = db.collection("summaries").doc("dashboard_summary");

    // Using .set() will create the document if it doesn't exist, or overwrite it if it does.
    return summaryRef.set(stats);
  });