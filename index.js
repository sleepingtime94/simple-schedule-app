const express = require("express");
const schedule = require("node-schedule");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const fs = require("fs");

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
    if (!schedule.time || !schedule.phone || !schedule.message) {
      throw new Error("Missing required fields: time, phone or message.");
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
      const payload = {
        phone: scheduleData.phone,
        message: scheduleData.message,
      };

      try {
        await axios.post(process.env.API_URL, payload);
        console.log(`Successfully sent message to: ${scheduleData.phone}`);
        job.cancel(); // Cancel the job after successful execution
      } catch (error) {
        console.error(
          `Failed to send message to: ${scheduleData.phone}:`,
          error.message
        );
      }
    });
  } catch (error) {
    console.error("Error scheduling job:", error.message);
  }
}

// Creating log
const logMessageToFile = (logData) => {
  const logFilePath = "./logs.json";

  try {
    // Initialize logs as an empty array
    let logs = [];

    // Check if file exists
    if (fs.existsSync(logFilePath)) {
      try {
        // Read existing logs
        const fileContent = fs.readFileSync(logFilePath, "utf8");
        const parsedData = JSON.parse(fileContent);

        // Ensure that parsed data is an array
        if (Array.isArray(parsedData)) {
          logs = parsedData;
        } else {
          console.warn(
            "Logs file does not contain an array. Creating a new logs array."
          );
        }
      } catch (parseError) {
        console.error("Error parsing logs file:", parseError);
        console.log("Creating a new logs array.");
      }
    } else {
      console.log("Logs file does not exist. Creating a new one.");
    }

    // Get current date and time
    const now = new Date();

    // Add new log with detailed timestamp information
    logs.push({
      ...logData,
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
    });

    // Write updated logs back to file
    fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2), "utf8");
    console.log("Message logged successfully");
  } catch (error) {
    console.error("Error logging message:", error);
  }
};

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

    // Log the message
    logMessageToFile({
      data: schedules,
    });

    res.status(200).json({
      message: "Schedule created.",
      data: schedules,
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
