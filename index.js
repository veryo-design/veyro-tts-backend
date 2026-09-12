import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

const DEFAULT_VOICE_ID = "21m00Tcm4TlvDq8ikWAM";

app.get("/", (req, res) => {
  res.json({
    status: "online",
    service: "VEYRO Text-to-Speech",
    endpoint: "/tts"
  });
});

app.get("/tts", (req, res) => {
  res.json({
    status: "online",
    message: "VEYRO TTS endpoint is ready."
  });
});

app.post("/tts", async (req, res) => {
  try {
    if (!ELEVENLABS_API_KEY) {
      return res.status(500).json({
        error: "ELEVENLABS_API_KEY is missing from Vercel."
      });
    }

    const {
      text,
      voice_id = DEFAULT_VOICE_ID,
      speed = 1
    } = req.body || {};

    if (!text || !text.trim()) {
      return res.status(400).json({
        error: "Text is required."
      });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg"
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0,
            use_speaker_boost: true
          },
          speed: Math.max(
            0.7,
            Math.min(1.2, Number(speed) || 1)
          )
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "ElevenLabs HTTP",
        response.status,
        errorText
      );

      return res.status(response.status).json({
        error: `ElevenLabs error (${response.status}): ${errorText}`
      });
    }

    const audioBuffer = Buffer.from(
      await response.arrayBuffer()
    );

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audioBuffer.length),
      "Cache-Control": "no-store"
    });

    return res.send(audioBuffer);

  } catch (error) {
    console.error("VEYRO TTS error:", error);

    return res.status(500).json({
      error: error.message || "TTS server error."
    });
  }
});

export default app;
