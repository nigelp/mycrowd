![mycrowdscreengrabsmall](https://github.com/user-attachments/assets/1acae698-b157-42af-a4e0-6205214bfdc1)


# MyCrowd

MyCrowd is a Windows based social media application that simulates interactions with local AI-powered personas. Users can create posts and receive comments from various AI personalities. The application leverages local AI models through Ollama to generate dynamic and contextually appropriate responses. Users can also add their own system prompts to play with the characteristics of the conversations (e.g. 'talk like a pirate'). NOTE: This app was wholly created using the CodeCompanion.ai 'vibe-coding' tool using Anthropic Claude 3.7 Sonnet and OpenRouter.ai. Plus a little help from o3-mini. :)

## Features

- **Interactive Social Feed**: Create posts and see AI-generated comments and interactions
- **Multiple AI Personas**: Engage with various AI personalities, each with unique traits and communication styles
- **Anonymous Users**: Configure anonymous users with different personality types for more diverse interactions
- **Customizable Settings**: Change the AI model and system prompt to alter response styles
- **Conversation Memory**: AI responses take into account the post content and previous comments
- **Response Variety**: Built-in mechanisms to ensure varied and non-repetitive AI responses
- **Save and Load Conversations**: Preserve and restore conversation threads

## Prerequisites

- Python 3.6 or higher
- Flask
- [Ollama](https://ollama.ai/) running locally for AI model inference
- LLM models available in Ollama (the app uses "hf.co/bartowski/Darkest-muse-v1-GGUF:Q2_K" by default)

## Installation

1. Clone the repository:
```
git clone https://github.com/YOUR-USERNAME/MyCrowd.git
cd MyCrowd
```

2. Install dependencies:
```
pip install -r requirements.txt
```

3. Make sure Ollama is installed and running on your system:
```
# Check if Ollama is running
curl http://localhost:11434/api/tags
```

## Usage

1. Start the application:
```
python app.py
```
Or use the provided batch file:
```
start.bat
```

2. The application will automatically open in your default web browser at `http://localhost:5000`

3. Create posts and interact with the AI personalities!

## Configuration

### AI Model

1. Go to the Settings page by clicking "Settings" in the navigation bar
2. Select a different model from the dropdown list (models are fetched from your local Ollama installation)
3. Click "Save Model" to apply the change

### System Prompt

1. On the Settings page, edit the system prompt text area
2. This prompt controls the general behavior of all AI personas
3. Click "Save System Prompt" to apply changes

### Anonymous Users

1. On the Settings page, adjust the number of anonymous users (0-7)
2. These users have randomly assigned personalities (angry, happy, sad, etc.)
3. Click "Save Anon Users" to apply changes

## Persistence

- **AI Model**: Selected model is saved in `model_settings.json`
- **System Prompt**: Custom prompt is saved in `system_prompt.json`
- **Anonymous Users**: Settings are saved in `anon_settings.json`
- **Posts**: Conversation threads can be saved in `saved_posts.json` using the "Save Posts" button

## Building a Standalone Executable

A build script (`build.bat`) is included to create a standalone executable using PyInstaller:

```
build.bat
```

The executable will be created in the `dist` folder.

## Project Structure

- `app.py`: Main Flask application with API endpoints and logic
- `templates/`: HTML templates for the web interface
- `static/`: JavaScript, CSS, and assets
  - `app.js`: Frontend logic for the social feed
  - `settings.js`: Frontend logic for the settings page
  - `style.css`: Styling for the application
  - `avatars/`: Profile images for AI personas

## License

[MIT License](LICENSE)

## Acknowledgements

- This project uses [Flask](https://flask.palletsprojects.com/) for the web framework
- AI responses are generated using [Ollama](https://ollama.ai/)
- UI is built with vanilla JavaScript and CSS
