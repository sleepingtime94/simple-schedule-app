const express = require("express");
const schedule = require("node-schedule");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Root route
app.get("/", (req, res) => {
  res.send("Server is running!");
});

/**
 * Validate the incoming schedule data.
 *
 * @param {Array} schedules - Array of schedule objects.
 * @returns {boolean} - Returns true if valid, otherwise throws an error.
 */
function validateScheduleData(schedules) {
  if (!Array.isArray(schedules)) {
    throw new Error("Input must be an array.");
  }

  for (const schedule of schedules) {
    if (
      !schedule.time ||
      !schedule.phone ||
      !schedule.name ||
      !schedule.medicine
    ) {
      throw new Error(
        "Missing required fields: time, phone, name, or medicine."
      );
    }
  }

  return true;
}

/**
 * Schedule a message to be sent at a specific time.
 *
 * @param {Object} scheduleData - The schedule object containing time, phone, name, and medicine.
 */
function scheduleMessage(scheduleData) {
  try {
    const job = schedule.scheduleJob(scheduleData.time, async () => {
      const message = `Halo ${scheduleData.name},\nIni waktunya kamu minum obat ${scheduleData.medicine}\n\nGemaantik.id`;
      const payload = {
        phone: scheduleData.phone,
        message: message,
      };

      try {
        await axios.post(process.env.API_URL, payload);
        console.log(`Successfully sent message to ${scheduleData.phone}`);
        job.cancel(); // Cancel the job after successful execution
      } catch (error) {
        console.error(
          `Failed to send message to ${scheduleData.phone}:`,
          error.message
        );
      }
    });
  } catch (error) {
    console.error("Error scheduling job:", error.message);
  }
}

// Schedule endpoint
app.post("/schedule", (req, res) => {
  try {
    const schedules = req.body;

    // Validate the incoming data
    validateScheduleData(schedules);

    // Schedule each message
    schedules.forEach((scheduleData) => {
      scheduleMessage(scheduleData);
    });

    res.status(200).json({
      message: "Schedule created.",
      scheduledMessages: schedules,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.APP_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
