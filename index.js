const express = require("express");
const schedule = require("node-schedule");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs").promises;

require("dotenv").config();

const app = express();
const activeJobs = new Map();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Application running...");
});

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

function scheduleMessage(scheduleData) {
  try {
    const key = scheduleData.phone;
    if (activeJobs.has(key)) {
      console.log(`:: Job for ${key} already scheduled, skipping.`);
      return;
    }
    const job = schedule.scheduleJob(scheduleData.time, async () => {
      const payload = {
        phone: scheduleData.phone,
        message: scheduleData.message,
      };
      try {
        await axios.post(process.env.API_URL, payload);
        console.log(`:: Successfully sent message to: ${scheduleData.phone}`);
        activeJobs.delete(key);
      } catch (error) {
        console.error(
          `Failed to send message to: ${scheduleData.phone}:`,
          error.message
        );
      }
    });
    activeJobs.set(key, job);
  } catch (error) {
    console.error(":: Error scheduling job:", error.message);
  }
}

async function logMessageToFile(logData) {
  const logFilePath = "./logs.json";
  try {
    let logs = [];
    if (await fs.stat(logFilePath).catch(() => false)) {
      const fileContent = await fs.readFile(logFilePath, "utf8");
      const parsedData = JSON.parse(fileContent);
      if (Array.isArray(parsedData)) logs = parsedData;
    }
    const now = new Date();
    logs.push({ ...logData, date: now.toISOString() });
    await fs.writeFile(logFilePath, JSON.stringify(logs, null, 2), "utf8");
    console.log(":: Message logged successfully");
  } catch (error) {
    console.error(":: Error logging message:", error);
  }
}

app.post("/schedule", async (req, res) => {
  try {
    const schedules = req.body;
    validateScheduleData(schedules);
    schedules.forEach((scheduleData) => {
      scheduleMessage(scheduleData);
    });
    await logMessageToFile({ data: schedules });
    res.status(200).json({ message: "Schedule created.", data: schedules });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get("/logs", async (req, res) => {
  const logFilePath = "./logs.json";
  try {
    if (await fs.stat(logFilePath).catch(() => false)) {
      const logs = JSON.parse(await fs.readFile(logFilePath, "utf8"));
      res.status(200).json(logs);
    } else {
      res.status(200).json([]);
    }
  } catch (error) {
    console.error(":: Error reading logs:", error);
    res.status(500).json({ error: "Failed to read logs" });
  }
});

const PORT = process.env.APP_PORT || 3000;
app.listen(PORT, () => {
  console.log(`:: Server is running on port ${PORT}`);
});
