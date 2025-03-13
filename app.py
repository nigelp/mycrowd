import json
import os
import random
import time
from datetime import datetime
from flask import Flask, request, jsonify, render_template, send_from_directory
import requests
import webbrowser

app = Flask(__name__, static_folder='static')

# In-memory storage for our app
posts = []
ai_profiles = [
    {"id": 1, "name": "TechEnthusiast", "avatar": "avatar1.png", "bio": "Always excited about the latest tech innovations!"},
    {"id": 2, "name": "FitnessGuru", "avatar": "avatar2.png", "bio": "Health and wellness advocate. Love sharing fitness tips!"},
    {"id": 3, "name": "Philosopher", "avatar": "avatar3.png", "bio": "Contemplating the deeper questions of existence."},
    {"id": 4, "name": "FoodieExplorer", "avatar": "avatar4.png", "bio": "On a mission to discover the world's best cuisines."},
    {"id": 5, "name": "ArtisticSoul", "avatar": "avatar5.png", "bio": "Finding beauty in everything. Art is life."},
]

# Fixed personalities for anonymous users
anon_personalities = [
    {"type": "angry", "bio": "Often frustrated and quick to express displeasure."},
    {"type": "happy", "bio": "Always looking on the bright side of life!"},
    {"type": "sad", "bio": "Feeling down and melancholic most of the time."},
    {"type": "confused", "bio": "Frequently puzzled by what's happening around them."},
    {"type": "negative", "bio": "Tends to see the worst in every situation."},
    {"type": "sarcastic", "bio": "Masters the art of saying one thing and meaning another."},
    {"type": "helpful", "bio": "Always ready to lend a hand and offer solutions."}
]

# Default number of anonymous users (0-7)
num_anon_users = 0

# Load anon users setting from file if it exists
try:
    if os.path.exists('anon_settings.json'):
        with open('anon_settings.json', 'r') as f:
            anon_settings = json.load(f)
            if 'num_anon_users' in anon_settings:
                num_anon_users = max(0, min(7, anon_settings['num_anon_users']))
except Exception as e:
    print(f"Error loading anon settings from file: {e}")

# Default system prompt
system_prompt = "You are an AI assistant in a social media app. Be helpful, friendly, and engaging."

# Load system prompt from file if it exists
try:
    if os.path.exists('system_prompt.json'):
        with open('system_prompt.json', 'r') as f:
            system_prompt_data = json.load(f)
            if 'system_prompt' in system_prompt_data and system_prompt_data['system_prompt']:
                system_prompt = system_prompt_data['system_prompt']
except Exception as e:
    print(f"Error loading system prompt from file: {e}")

# Default AI model
current_model = "hf.co/bartowski/Darkest-muse-v1-GGUF:Q2_K"

# Load model settings from file if it exists
try:
    if os.path.exists('model_settings.json'):
        with open('model_settings.json', 'r') as f:
            model_settings = json.load(f)
            if 'model' in model_settings and model_settings['model']:
                current_model = model_settings['model']
except Exception as e:
    print(f"Error loading model settings from file: {e}")

# Generate some initial posts
for i in range(2):  # Changed from 5 to 2
    posts.append({
        "id": i,
        "author": random.choice(ai_profiles),
        "content": f"This is an AI-generated post #{i}",
        "timestamp": (datetime.now().timestamp() - random.randint(0, 86400)),
        "likes": random.randint(0, 100),
        "comments": []
    })

# Sort posts by timestamp (newest first)
posts.sort(key=lambda x: x["timestamp"], reverse=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/settings')
def settings():
    return render_template('settings.html')

@app.route('/api/posts', methods=['GET'])
def get_posts():
    return jsonify(posts)

@app.route('/api/posts', methods=['POST'])
def create_post():
    data = request.json
    user_content = data.get('content', '')
    
    if not user_content:
        return jsonify({"error": "Post content is required"}), 400
    
    # Create the user's post
    post_id = len(posts)
    user_post = {
        "id": post_id,
        "author": {"id": 0, "name": "You", "avatar": "user.png", "bio": "This is you!"},
        "content": user_content,
        "timestamp": datetime.now().timestamp(),
        "likes": 0,
        "comments": []
    }
    
    posts.insert(0, user_post)
    
    # Generate AI responses using Ollama
    generate_ai_responses(post_id, user_content)
    
    return jsonify(user_post)

def generate_ai_responses(post_id, user_content):
    global system_prompt, num_anon_users
    # Select which AI profiles will respond (2-4 random profiles)
    responding_profiles = random.sample(ai_profiles, random.randint(2, 4))
    
    # Add anonymous users if configured
    anon_users = []
    if num_anon_users > 0:
        # Create temporary anon profiles with random personalities
        # Use random.sample to get unique personalities if num_anon_users <= 7
        # Otherwise, allow duplicates with random.choices
        if num_anon_users <= 7:
            selected_personalities = random.sample(anon_personalities, num_anon_users)
        else:
            selected_personalities = random.choices(anon_personalities, k=num_anon_users)
            
        for i, personality in enumerate(selected_personalities):
            anon_users.append({
                "id": 100 + i,  # Use high IDs to avoid conflicts
                "name": "Anon",
                "avatar": "avatar7.png",
                "bio": personality["bio"],
                "personality_type": personality["type"]
            })
    
    # Combine and shuffle all responding profiles to interweave anon users with regular profiles
    all_profiles = responding_profiles + anon_users
    random.shuffle(all_profiles)
    
    # Response style variations to reduce repetitiveness
    response_styles = [
        "Start with a question",
        "Begin with an exclamation",
        "Start with a personal anecdote",
        "Begin with a controversial statement",
        "Start with a fact or statistic",
        "Start with a quote",
        "Start with a direct address",
        "Start with a hypothetical scenario"
    ]
    
    # Banned phrases and words to avoid repetitive structures
    banned_phrases = [
        "Ah", "Oh", "Well", "Hmm", "So", "I see", "You know", 
        "Actually", "Honestly", "Basically", "Literally",
        "Interesting", "Wow", "Huh", "Right"
    ]
    
    banned_structures = [
        "starting with an interjection followed by a comma",
        "beginning with 'I think'",
        "starting with 'In my opinion'",
        "using phrases like 'to be honest' or 'honestly'",
        "beginning with 'Well,'",
        "starting with 'You know,'",
        "using 'Actually,' at the start",
        "beginning with 'So,'",
        "starting with 'I mean,'"
    ]
    
    # Extract key terms from user content to avoid repetition
    user_words = user_content.lower().split()
    # Filter out common words that are less than 4 characters
    key_terms = [word for word in user_words if len(word) >= 4]
    
    for i, profile in enumerate(all_profiles):
        # Assign a different response style to each profile to ensure variety
        style = response_styles[i % len(response_styles)]
        
        # Prepare prompt for Ollama
        personality_type = profile.get('personality_type', '')
        if personality_type:
            # For anon users, include personality type in the prompt
            prompt = f"""
            {system_prompt}
            You are an anonymous user with a {personality_type} personality. Your bio: "{profile['bio']}".
            Respond to this social media post in a single paragraph (max 2-3 sentences):
            "{user_content}"
            
            Your response should strongly reflect your {personality_type} personality. Be conversational and natural.
            
            IMPORTANT INSTRUCTIONS:
            1. To avoid repetitive responses, please {style.lower()}.
            2. Do NOT start your response the same way as others might. Be unique and distinctive in your approach.
            3. Avoid directly repeating these key terms from the user's message: {', '.join(key_terms)}
            4. Instead of repeating the exact words, refer to the topic indirectly or use synonyms.
            5. Discuss the subject matter without explicitly repeating the user's phrasing.
            6. DO NOT use these words to start your response: {', '.join(banned_phrases)}
            7. Avoid these repetitive sentence structures: {', '.join(banned_structures)}
            8. Each response should have a completely different structure from other responses.
            """
        else:
            # For regular AI profiles
            prompt = f"""
            {system_prompt}
            You are {profile['name']}, an AI with this bio: "{profile['bio']}".
            Respond to this social media post in a single paragraph (max 2-3 sentences):
            "{user_content}"
            
            Your response should match your persona. Be conversational and natural.
            
            IMPORTANT INSTRUCTIONS:
            1. To avoid repetitive responses, please {style.lower()}.
            2. Do NOT start your response the same way as others might. Be unique and distinctive in your approach.
            3. Avoid directly repeating these key terms from the user's message: {', '.join(key_terms)}
            4. Instead of repeating the exact words, refer to the topic indirectly or use synonyms.
            5. Discuss the subject matter without explicitly repeating the user's phrasing.
            6. DO NOT use these words to start your response: {', '.join(banned_phrases)}
            7. Avoid these repetitive sentence structures: {', '.join(banned_structures)}
            8. Each response should have a completely different structure from other responses.
            """
        
        try:
            # Call Ollama API with the current model
            response = requests.post('http://localhost:11434/api/generate', 
                                    json={
                                        "model": current_model,
                                        "prompt": prompt,
                                        "stream": False
                                    })
            
            if response.status_code == 200:
                ai_response = response.json().get('response', '').strip()
                
                # Add comment to the post
                for post in posts:
                    if post["id"] == post_id:
                        post["comments"].append({
                            "id": len(post["comments"]),
                            "author": profile,
                            "content": ai_response,
                            "timestamp": datetime.now().timestamp()
                        })
                        break
            else:
                print(f"Error from Ollama API: {response.text}")
                # Try to load the model if it's not loaded
                load_response = requests.post('http://localhost:11434/api/generate', 
                                             json={"model": current_model, "prompt": ""})
                if load_response.status_code == 200:
                    # Retry the generation after loading the model
                    retry_response = requests.post('http://localhost:11434/api/generate', 
                                                 json={
                                                     "model": current_model,
                                                     "prompt": prompt,
                                                     "stream": False
                                                 })
                    if retry_response.status_code == 200:
                        ai_response = retry_response.json().get('response', '').strip()
                        # Add comment to the post
                        for post in posts:
                            if post["id"] == post_id:
                                post["comments"].append({
                                    "id": len(post["comments"]),
                                    "author": profile,
                                    "content": ai_response,
                                    "timestamp": datetime.now().timestamp()
                                })
                                break
                
        except Exception as e:
            print(f"Error generating AI response: {str(e)}")
            # Add a fallback comment if Ollama fails
            for post in posts:
                if post["id"] == post_id:
                    post["comments"].append({
                        "id": len(post["comments"]),
                        "author": profile,
                        "content": f"Interesting post! I'd love to hear more about that.",
                        "timestamp": datetime.now().timestamp()
                    })
                    break

@app.route('/api/profiles', methods=['GET'])
def get_profiles():
    return jsonify(ai_profiles)

@app.route('/api/models', methods=['GET'])
def get_models():
    try:
        # Call Ollama API to list models
        response = requests.get('http://localhost:11434/api/tags')
        
        if response.status_code == 200:
            # Parse the response JSON
            models_data = response.json()
            
            # The Ollama API returns a list of models in the 'models' field
            if 'models' in models_data:
                models = models_data['models']
            else:
                # If not, the response itself might be the list of models
                models = models_data
            
            return jsonify({
                "models": models,
                "current_model": current_model
            })
        else:
            return jsonify({"error": f"Failed to fetch models from Ollama: {response.status_code}"}), 500
            
    except Exception as e:
        print(f"Error fetching models: {str(e)}")
        return jsonify({"error": "Could not connect to Ollama. Make sure it's running."}), 500

@app.route('/api/models/<model_name>', methods=['GET'])
def get_model_info(model_name):
    try:
        # First try to get model info from the list of available models
        models_response = requests.get('http://localhost:11434/api/tags')
        if models_response.status_code == 200:
            models_data = models_response.json()
            models = models_data.get('models', [])
            
            # Find the model in the list
            for model in models:
                if isinstance(model, dict) and model.get('name') == model_name:
                    return jsonify(model)
            
        # If model not found in list or list request failed, try the show API
        # Using POST with model parameter (this is the correct format per Ollama API docs)
        show_response = requests.post('http://localhost:11434/api/show', 
                                    json={"model": model_name})
        
        if show_response.status_code == 200:
            model_info = show_response.json()
            return jsonify(model_info)
        
        # If all attempts fail, return basic info to avoid errors
        return jsonify({
            "name": model_name,
            "details": {
                "parameter_size": "Unknown",
                "family": "Unknown"
            }
        })
            
    except Exception as e:
        print(f"Error fetching model info: {str(e)}")
        # Return basic info instead of an error to avoid breaking the UI
        return jsonify({
            "name": model_name,
            "details": {
                "parameter_size": "Unknown",
                "family": "Unknown"
            }
        })

@app.route('/api/settings', methods=['POST'])
def update_settings():
    global current_model
    data = request.json
    new_model = data.get('model')
    
    if not new_model:
        return jsonify({"error": "Model name is required"}), 400
    
    try:
        # First check if the model exists in the list of available models
        models_response = requests.get('http://localhost:11434/api/tags')
        if models_response.status_code == 200:
            models_data = models_response.json()
            models = models_data.get('models', [])
            
            model_exists = False
            for model in models:
                if isinstance(model, dict) and model.get('name') == new_model:
                    model_exists = True
                    break
                elif model == new_model:
                    model_exists = True
                    break
            
            if not model_exists:
                return jsonify({"error": f"Model {new_model} not found in Ollama"}), 400
        
        # Now load the model into memory
        load_response = requests.post('http://localhost:11434/api/generate', 
                                     json={"model": new_model, "prompt": ""})
        
        if load_response.status_code == 200:
            # Update the current model
            current_model = new_model
            
            # Save model settings to file for persistence
            try:
                with open('model_settings.json', 'w') as f:
                    json.dump({"model": current_model}, f)
            except Exception as e:
                print(f"Error saving model settings: {e}")
            
            return jsonify({"success": True, "model": current_model})
        else:
            return jsonify({"error": f"Failed to load model {new_model}. Error: {load_response.text}"}), 500
            
    except Exception as e:
        print(f"Error updating model: {str(e)}")
        return jsonify({"error": "Could not connect to Ollama. Make sure it's running."}), 500

@app.route('/api/system-prompt', methods=['GET'])
def get_system_prompt():
    global system_prompt
    return jsonify({"system_prompt": system_prompt})

@app.route('/api/system-prompt', methods=['POST'])
def update_system_prompt():
    global system_prompt
    data = request.json
    new_prompt = data.get('system_prompt', '')
    
    if not new_prompt:
        return jsonify({"error": "System prompt cannot be empty"}), 400
    
    system_prompt = new_prompt
    
    # Optionally save to a file for persistence
    try:
        with open('system_prompt.json', 'w') as f:
            json.dump({"system_prompt": system_prompt}, f)
    except Exception as e:
        print(f"Error saving system prompt: {e}")
    
    return jsonify({"success": True, "system_prompt": system_prompt})

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/api/anon-users', methods=['GET'])
def get_anon_users():
    global num_anon_users
    return jsonify({"num_anon_users": num_anon_users})

@app.route('/api/anon-users', methods=['POST'])
def update_anon_users():
    global num_anon_users
    data = request.json
    
    if 'num_anon_users' not in data:
        return jsonify({"error": "Missing num_anon_users parameter"}), 400
    
    try:
        new_num_anon_users = int(data['num_anon_users'])
        if new_num_anon_users < 0 or new_num_anon_users > 7:
            return jsonify({"error": "Number of anonymous users must be between 0 and 7"}), 400
        
        num_anon_users = new_num_anon_users
        
        # Save to file
        with open('anon_settings.json', 'w') as f:
            json.dump({"num_anon_users": num_anon_users}, f)
        
        return jsonify({"success": True, "num_anon_users": num_anon_users})
    except ValueError:
        return jsonify({"error": "Invalid number format"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/posts/<int:post_id>/comments', methods=['POST'])
def add_comment_to_post(post_id):
    data = request.json
    user_content = data.get('content', '')
    
    if not user_content:
        return jsonify({"error": "Comment content is required"}), 400
    
    # Find the post
    post = None
    for p in posts:
        if p["id"] == post_id:
            post = p
            break
    
    if not post:
        return jsonify({"error": "Post not found"}), 404
    
    # Add user's comment to the post
    comment_id = len(post["comments"])
    user_comment = {
        "id": comment_id,
        "author": {"id": 0, "name": "You", "avatar": "user.png", "bio": "This is you!"},
        "content": user_content,
        "timestamp": datetime.now().timestamp()
    }
    
    post["comments"].append(user_comment)
    
    # Generate AI responses to the comment
    generate_ai_comment_responses(post_id, user_content)
    
    return jsonify({"success": True, "comment": user_comment})

def generate_ai_comment_responses(post_id, user_content):
    global system_prompt
    # Select 1-2 random AI profiles to respond to the comment
    responding_profiles = random.sample(ai_profiles, random.randint(1, 2))
    
    # Find the post and get its content and previous comments for context
    post = None
    for p in posts:
        if p["id"] == post_id:
            post = p
            break
    
    if not post:
        return
    
    # Build context from the post and its comments
    post_content = post["content"]
    comments_context = ""
    if post["comments"]:
        # Get the last 3 comments for context (or all if less than 3)
        recent_comments = post["comments"][-3:]
        for comment in recent_comments:
            comments_context += f"{comment['author']['name']}: {comment['content']}\n"
    
    for profile in responding_profiles:
        # Prepare prompt for Ollama with context
        prompt = f"""
        {system_prompt}
        You are {profile['name']}, an AI with this bio: "{profile['bio']}".
        
        You are responding to a comment in a social media thread. Here's the context:
        
        Original post: "{post_content}"
        
        Recent conversation:
        {comments_context}
        
        The most recent comment from the user: "{user_content}"
        
        Respond to this comment in a single paragraph (max 2-3 sentences). Be conversational and natural.
        Your response should match your persona and continue the conversation naturally.
        """
        
        try:
            # Call Ollama API with the current model
            response = requests.post('http://localhost:11434/api/generate', 
                                    json={
                                        "model": current_model,
                                        "prompt": prompt,
                                        "stream": False
                                    })
            
            if response.status_code == 200:
                ai_response = response.json().get('response', '').strip()
                
                # Add AI comment to the post
                post["comments"].append({
                    "id": len(post["comments"]),
                    "author": profile,
                    "content": ai_response,
                    "timestamp": datetime.now().timestamp()
                })
            else:
                print(f"Error from Ollama API: {response.text}")
                # Add a fallback comment if Ollama fails
                post["comments"].append({
                    "id": len(post["comments"]),
                    "author": profile,
                    "content": f"I see what you mean. That's an interesting perspective!",
                    "timestamp": datetime.now().timestamp()
                })
                
        except Exception as e:
            print(f"Error generating AI response: {str(e)}")
            # Add a fallback comment if Ollama fails
            post["comments"].append({
                "id": len(post["comments"]),
                "author": profile,
                "content": f"Thanks for sharing your thoughts on this topic.",
                "timestamp": datetime.now().timestamp()
            })

@app.route('/api/posts/page/<int:page>', methods=['GET'])
def get_posts_paginated(page):
    posts_per_page = 5  # Number of posts per page
    start_idx = (page - 1) * posts_per_page
    end_idx = start_idx + posts_per_page
    
    # Get a slice of posts for the requested page
    paginated_posts = posts[start_idx:end_idx]
    
    # Return total count along with the paginated posts
    return jsonify({
        'posts': paginated_posts,
        'total_posts': len(posts),
        'total_pages': (len(posts) + posts_per_page - 1) // posts_per_page,
        'current_page': page
    })

@app.route('/api/posts/save', methods=['POST'])
def save_posts():
    try:
        # Save posts to a JSON file
        with open('saved_posts.json', 'w') as f:
            json.dump(posts, f)
        return jsonify({"success": True, "message": "Posts saved successfully"})
    except Exception as e:
        print(f"Error saving posts: {str(e)}")
        return jsonify({"error": f"Failed to save posts: {str(e)}"}), 500

@app.route('/api/posts/load', methods=['POST'])
def load_posts():
    global posts
    try:
        data = request.json
        
        # Handle two possible scenarios:
        # 1. Direct JSON payload with posts from frontend
        # 2. Request to load from saved_posts.json file
        
        if data and 'posts' in data and isinstance(data['posts'], list):
            # Use the provided posts from the request
            loaded_posts = data['posts']
            posts = loaded_posts
            return jsonify({"success": True, "message": "Posts loaded successfully", "count": len(posts)})
        else:
            # Fallback to loading from saved file
            if not os.path.exists('saved_posts.json'):
                return jsonify({"error": "No saved posts found"}), 404
                
            # Load posts from JSON file
            with open('saved_posts.json', 'r') as f:
                loaded_posts = json.load(f)
                
            # Replace current posts with loaded posts
            posts = loaded_posts
            return jsonify({"success": True, "message": "Posts loaded successfully", "count": len(posts)})
    except Exception as e:
        print(f"Error loading posts: {str(e)}")
        return jsonify({"error": f"Failed to load posts: {str(e)}"}), 500

@app.route('/api/posts/check-saved', methods=['GET'])
def check_saved_posts():
    try:
        # Check if saved posts file exists
        if os.path.exists('saved_posts.json'):
            # Get file modification time
            mod_time = os.path.getmtime('saved_posts.json')
            mod_date = datetime.fromtimestamp(mod_time).strftime('%Y-%m-%d %H:%M:%S')
            
            # Get count of saved posts
            with open('saved_posts.json', 'r') as f:
                saved_posts = json.load(f)
                count = len(saved_posts)
                
            return jsonify({
                "exists": True, 
                "count": count,
                "last_saved": mod_date
            })
        else:
            return jsonify({"exists": False})
    except Exception as e:
        print(f"Error checking saved posts: {str(e)}")
        return jsonify({"error": f"Failed to check saved posts: {str(e)}"}), 500

#if __name__ == '__main__':
     # Open the default web browser to the application URL
     #webbrowser.open_new('http://localhost:5000')
     #app.run(debug=True, port=5000)
     
if __name__ == '__main__':
    import os
    if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
        webbrowser.open_new('http://localhost:5000')
    app.run(debug=True, port=5000)