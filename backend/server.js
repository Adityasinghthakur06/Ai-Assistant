// Import required modules
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// Initialize Express application
const app = express();

// Middleware
app.use(bodyParser.json({ limit: "50mb" })); // For parsing large JSON payloads
app.use(cors());

// In-memory storage for conversation history and user memory
const userConversations = {}; // Conversation history for each user
const userMemory = {}; // Contextual memory for facts or preferences

// Utility function to trim conversation history
function trimConversationHistory(userId, maxMessages = 50) {
    if (userConversations[userId] && userConversations[userId].length > maxMessages) {
        userConversations[userId] = userConversations[userId].slice(-maxMessages);
    }
}

// Test Route for Debugging
app.get("/", (req, res) => {
    res.send("Server is running and ready to accept requests!");
});

// API Route for AI Responses
app.post("/api", async (req, res) => {
    const { input, userId } = req.body;

    if (!input) return res.status(400).send({ error: "Input is required" });
    if (!userId) return res.status(400).send({ error: "User ID is required" });

    try {
        // Initialize user history if not present
        if (!userConversations[userId]) {
            userConversations[userId] = [{ role: "system", content: "You are a helpful assistant." }];
        }

        // Add the user message to the conversation history
        userConversations[userId].push({ role: "user", content: input });

        // Add contextual memory to the assistant's initial system message
        if (userMemory[userId]) {
            const memoryData = Object.entries(userMemory[userId])
                .map(([key, value]) => `${key}: ${value}`)
                .join(", ");
            userConversations[userId][0].content += ` The user has mentioned: ${memoryData}`;
        }

        // Call OpenAI API with the conversation history
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4",
                messages: userConversations[userId],
                max_tokens: 300,
                temperature: 0.7,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        // Get the assistant's reply
        const aiResponse = response.data.choices[0].message.content.trim();

        // Add the AI response to the conversation history
        userConversations[userId].push({ role: "assistant", content: aiResponse });

        // Save any factual information from the AI response to user memory
        const memoryRegex = /remember that (.+?)\./i;
        const memoryMatch = aiResponse.match(memoryRegex);
        if (memoryMatch) {
            const fact = memoryMatch[1];
            userMemory[userId] = userMemory[userId] || {};
            userMemory[userId][fact] = true;
        }

        // Trim conversation history
        trimConversationHistory(userId);

        // Return the AI response
        res.send({ response: aiResponse });
    } catch (error) {
        console.error("Error communicating with OpenAI API:", error.message);
        res.status(500).send({ error: "Error processing AI request" });
    }
});

// Weather Endpoint using OpenAI
app.post("/weather", async (req, res) => {
    const { location } = req.body;

    if (!location) {
        return res.status(400).send({ error: "Location is required" });
    }

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are a weather assistant who provides current weather information for any location.",
                    },
                    {
                        role: "user",
                        content: `Can you provide the current weather for ${location}?`,
                    },
                ],
                max_tokens: 150,
                temperature: 0.7,
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const aiResponse = response.data.choices[0].message.content.trim();
        res.send({ weather: aiResponse });
    } catch (error) {
        console.error("Error fetching weather information:", error.message);
        res.status(500).send({ error: "Unable to fetch weather information using OpenAI." });
    }
});

// Joke Endpoint
app.get("/joke", async (req, res) => {
    try {
        const response = await axios.get("https://v2.jokeapi.dev/joke/Any?type=single");
        const joke = response.data.joke || "Couldn't fetch a joke right now.";
        res.send({ joke });
    } catch (error) {
        console.error("Error fetching joke:", error.message);
        res.status(500).send({ error: "Unable to fetch a joke." });
    }
});

// Trivia Game Endpoint
app.post("/trivia", (req, res) => {
    const questions = [
        { question: "What is the capital of France?", answer: "Paris" },
        { question: "What is 2 + 2?", answer: "4" },
    ];
    res.send({ questions });
});

// Handle Undefined Routes
app.use((req, res) => {
    res.status(404).send({ error: "Endpoint not found" });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
