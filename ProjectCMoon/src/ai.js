async function sendMessage(user_message, bot_role = "You are a helpful and friendly assistant.") {
    const url = "https://ai.hackclub.com/chat/completions";
  
    const payload = {
      messages: [
        { role: "system", content: bot_role },
        { role: "user", content: user_message }
      ]
    };
  
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
  
      if (!response.ok) {
        if (response.status === 413) {
          return '[413] Request too large or server limitation.';
        }
        throw new Error(`HTTP ${response.status}`);
      }
  
      const data = await response.json();
      const message = data.choices?.[0]?.message?.content;
      console.log("Bot reply:", message);
      return message;
    } catch (err) {
      console.error("Error:", err);
      return null;
    }
  }

export { sendMessage };