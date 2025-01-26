// Global Variables
let isSpeaking = false;
let isSpeakEnabled = true;
let selectedVoice = null;
const synth = window.speechSynthesis;
const voices = [];
const userId = "unique-user-id"; // Replace with a dynamic user ID if needed
let isConversationActive = false;

// Populate Voices Dropdown
function populateVoices() {
    const voiceDropdown = document.getElementById("voice-selection");
    const availableVoices = synth.getVoices();

    voiceDropdown.innerHTML = "";
    availableVoices.forEach((voice, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceDropdown.appendChild(option);
    });

    voices.length = 0;
    voices.push(...availableVoices);

    if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
    }
}

if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = populateVoices;
}

// Function to make the AI speak
function speak(text) {
    if (!isSpeakEnabled) return;

    if (isSpeaking) synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utterance.voice = selectedVoice;

    utterance.pitch = Math.random() * 0.15 + 0.85;
    utterance.rate = Math.random() * 0.05 + 0.9;

    utterance.onstart = () => (isSpeaking = true);
    utterance.onend = () => (isSpeaking = false);
    utterance.onerror = () => (isSpeaking = false);

    synth.speak(utterance);
}

// Add Flirty Tone
function addFlirtyTone(response) {
    if (selectedVoice?.name.toLowerCase().includes("female")) {
        const flirtyPhrases = [
            "Mmm, that sounds interesting, darling.",
            "You know how to ask the right questions. 😉",
            "Tell me more, I’m intrigued. 😏",
        ];
        const randomFlirty = flirtyPhrases[Math.floor(Math.random() * flirtyPhrases.length)];
        return `${response} ${randomFlirty}`;
    }
    return response;
}

// Handle AI Response
async function handleRequest(input) {
    const responseElement = document.getElementById("response");

    if (!input) {
        responseElement.textContent = "Please enter a message!";
        return;
    }

    try {
        if (isSpeaking) synth.cancel();

        const response = await fetch("http://localhost:5000/api", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input, userId }),
        });

        const data = await response.json();
        let aiResponse = data.response || "No response from AI.";

        aiResponse = addFlirtyTone(aiResponse);

        responseElement.textContent = aiResponse;
        speak(aiResponse);
    } catch (error) {
        console.error("Error communicating with the AI:", error);
        responseElement.textContent = "Error communicating with the AI.";
    }
}

// Get Weather
async function getWeather() {
    try {
        const response = await fetch("http://localhost:5000/weather", {
            method: "GET",
        });

        const data = await response.json();
        const weatherInfo = `The weather in ${data.city} is ${data.description} with a temperature of ${data.temperature}°C.`;
        document.getElementById("response").textContent = weatherInfo;
        speak(weatherInfo);
    } catch (error) {
        console.error("Error fetching weather:", error);
        document.getElementById("response").textContent = "Error fetching weather.";
    }
}

// Get Joke
async function getJoke() {
    try {
        const response = await fetch("http://localhost:5000/joke", {
            method: "GET",
        });

        const data = await response.json();
        const joke = data.joke || "Couldn't fetch a joke. Try again!";
        document.getElementById("response").textContent = joke;
        speak(joke);
    } catch (error) {
        console.error("Error fetching joke:", error);
        document.getElementById("response").textContent = "Error fetching joke.";
    }
}

// Start Trivia
async function startTrivia() {
    try {
        const response = await fetch("http://localhost:5000/trivia", {
            method: "GET",
        });

        const data = await response.json();
        const triviaQuestions = data.questions || [];
        let triviaText = triviaQuestions.map((q) => q.question).join("\n");
        document.getElementById("response").textContent = `Trivia Game Started:\n${triviaText}`;
        speak("Let's start a trivia game. Here's your first question!");
    } catch (error) {
        console.error("Error starting trivia game:", error);
        document.getElementById("response").textContent = "Error starting trivia game.";
    }
}

// Start Voice Recognition
function startVoiceRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Voice recognition is not supported in this browser.");
        return;
    }

    const recognition = new SpeechRecognition();

    recognition.onresult = (event) => {
        const spokenText = event.results[0][0].transcript;
        document.getElementById("user-input").value = spokenText;
        document.getElementById("send-btn").click();
    };

    recognition.onerror = (event) => {
        console.error("Error during voice recognition:", event.error);
    };

    recognition.start();
}

// Event Listeners
document.getElementById("send-btn").addEventListener("click", () => {
    const userInput = document.getElementById("user-input").value.trim();
    handleRequest(userInput);
});
document.getElementById("speak-toggle-btn").addEventListener("click", () => {
    isSpeakEnabled = !isSpeakEnabled;
    document.getElementById("speak-toggle-btn").textContent = isSpeakEnabled ? "Disable Speak" : "Enable Speak";
});
document.getElementById("voice-btn").addEventListener("click", startVoiceRecognition);
document.getElementById("get-weather-btn").addEventListener("click", getWeather);
document.getElementById("get-joke-btn").addEventListener("click", getJoke);
document.getElementById("start-trivia-btn").addEventListener("click", startTrivia);

// Initialize
populateVoices();
