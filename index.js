const express = require("express");
const schedule = require("node-schedule");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const axios = require("axios");

require("dotenv").config();

app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.post("/schedule", (req, res) => {
  const jadwalPesan = req.body;

  if (!Array.isArray(jadwalPesan)) {
    return res.status(400).json({ error: "Input must array." });
  }

  for (const jadwal of jadwalPesan) {
    if (!jadwal.time || !jadwal.phone) {
      return res.status(400).json({ error: "Empty key, check your input." });
    }
  }

  jadwalPesan.forEach((jadwal) => {
    try {
      const job = schedule.scheduleJob(jadwal.time, async () => {
        const hitMessage = `Halo ${jadwal.name},\nIni waktunya kamu minum obat ${jadwal.medicine}\n\nGemaantik.id`;

        const hitResponse = {
          phone: jadwal.phone,
          message: hitMessage,
        };

        try {
          const response = await axios.post(process.env.API_URL, hitResponse);
          console.log("Successfully sent message!");

          job.cancel();
        } catch (error) {
          console.error("Failed to send message!");
        }
      });
    } catch (error) {
      console.error(`Can't processing schedule.`, error);
    }
  });

  res.status(200).json({
    message: "Schedule created.",
    scheduledMessages: jadwalPesan,
  });
});

app.listen(process.env.APP_PORT, () => {
  console.log("Server is running on port 3000");
});
