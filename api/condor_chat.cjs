const fetch = require('node-fetch');
require('dotenv').config();

// 🔍 Debug: Check if API key is loaded at all
console.log("🔑 Checking OpenAI Key:", process.env.OPENAI_API_KEY ? "✅ Key Loaded" : "❌ Key Missing");

module.exports = async function condorChat(req, res) {
  const userMessage = req.body.message;

  if (!userMessage) {
    console.warn("⚠️ No message in request body");
    return res.status(400).json({ error: "Missing message in request." });
  }

  // 🔍 Log input
  console.log("📩 User asked:", userMessage);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are CondorGPT, a helpful, honest, slightly philosophical assistant for Gold Condor Capital."
          },
          { role: "user", content: userMessage }
        ]
      })
    });

    const data = await response.json();

    // 🔍 Check OpenAI error
    if (data.error) {
      console.error("❌ OpenAI API error:", JSON.stringify(data.error, null, 2));
      return res.status(500).json({
        error: "OpenAI returned error",
        detail: data.error.message,
        full: data.error
      });
    }

    const reply = data.choices?.[0]?.message?.content || "No response from GPT.";
    console.log("🤖 CondorGPT reply:", reply);

    res.json({ reply });
  } catch (err) {
    console.error("🔥 Failed to reach OpenAI:", err.message);
    res.status(500).json({
      error: "OpenAI request failed",
      detail: err.message
    });
  }
};
