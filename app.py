from flask import Flask, redirect, render_template, request, session
from flask_session import Session
import mysql.connector
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime
from PIL import Image
import io
from flask import Response
import base64
from flask import jsonify


# App settings
app = Flask(__name__)
app.secret_key = 'development_key'


# Database connection
def execute_query(query, params=None):
    connection = mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="chat_flask"
    )
    cursor = connection.cursor(dictionary=True)
    if params:
        cursor.execute(query, params)
    else:
        cursor.execute(query)
    data = cursor.fetchall()
    connection.commit()
    return data


@app.route("/")
def home():
    if session:
        return redirect("inbox")
    else:
        return redirect("login")


# Users Management
@app.route("/login", methods = ["GET", "POST"])
def login():
    # Check if user is already logged
    if session:
        return redirect("/")

    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        
        # Ensure username and password were submitted
        if not username:
            return render_template("users/login.html", message="Must provide username")
        elif not password:
            return render_template("users/login.html", message="Must provide password")

        # Check username and password
        user_data = execute_query("SELECT * FROM users WHERE username = %s", [username])
        print(user_data)
        if len(user_data) != 1 or not check_password_hash(user_data[0]["password"], password):
            return render_template("users/login.html", message="Invalid Credentials")
       
        # Log user
        session["user_id"] = user_data[0]["username"]

        # Redirect to /
        return redirect("/")

    return render_template("users/login.html")


@app.route("/logout")
def logout():
    session.clear()
    return redirect("/")


@app.route("/register", methods = ["GET", "POST"])
def register():
    # Check if user is already logged
    if session:
        return redirect("/")

    if request.method == "POST":
        username = request.form.get("username")
        email = request.form.get("email")
        password = request.form.get("password")
        password_confirmation = request.form.get("password_confirmation")

        # Ensure username was submitted
        if not username:
            return render_template("users/register.html", message="Must provide a username")
        # Ensure email was submitted
        elif not email:
            return render_template("users/register.html", message="Must provide a username")
        # Ensure password was submitted
        elif not password:
            return render_template("users/register.html", message="Must provide a password")
        # Ensure password confirmation is correct
        elif (not password_confirmation) or (password != password_confirmation):
            return render_template("users/register.html", message="The passwords are different")

        # Check that the input username is not already on the database
        check = execute_query("SELECT COUNT(*) FROM users WHERE username = %s;", [username])
        if check[0]["COUNT(*)"] > 0:
            return render_template("users/register.html", message="That username already exists, try another")

        # Encrypt password
        encrypted_password = generate_password_hash(password, method='pbkdf2:sha256', salt_length=8)

        # Insert the user info into the database
        query = "INSERT INTO users (username, email, password) VALUES (%s, %s, %s);"
        values = [username, email, encrypted_password]
        execute_query(query, values)

        # Redirect to login
        return redirect('login')

    return render_template("users/register.html")


@app.route("/my_profile")
def my_profile():
    query = execute_query("SELECT * from users WHERE username = %s;", [session["user_id"]])
    user_id = query[0]["id"]
    email = query[0]["email"]
    
    context = {
        "username" : session["user_id"],
        "user_id" : user_id,
        "email" : email,
    }

    return render_template("users/my_profile.html", context=context)


@app.route("/edit_profile", methods=["GET"])
def edit_profile():
    query = execute_query("SELECT id, email FROM users WHERE username = %s", [session["user_id"]])
    email = query[0]['email']
    my_id = query[0]['id']
    
    context = {
        "username" : session["user_id"],
        "id" : my_id,
        "email": email,
    }
    return render_template("users/edit_profile.html", context=context)


# Update data
@app.route("/update_email", methods=["POST"])
def update_email():
    new_email = request.form.get("email")
    execute_query("UPDATE users SET email = %s WHERE username = %s;", [new_email, session["user_id"]])
    return redirect("edit_profile")

@app.route("/update_password", methods=["POST"])
def update_password():
    new_password = request.form.get("password")
    password = generate_password_hash(new_password, method='pbkdf2:sha256', salt_length=8)
    execute_query("UPDATE users SET password = %s WHERE username = %s;", [password, session["user_id"]])
    return redirect("edit_profile")

@app.route("/upload_image", methods=["POST"])
def upload_images():
    image = request.files['image'].read()
    if not image:
        print("Not image uploaded")
    else:
        files = base64.b64encode(image)
        try:
            execute_query("UPDATE users SET profile_pic = %s WHERE username = %s", [files, session["user_id"]])
        except:
            print("Use JPEG image")
    
    return redirect("edit_profile")


# Get data
@app.route("/get_image/<int:id>")
def get_image(id):
    image = execute_query("SELECT profile_pic FROM users WHERE id=%s;", [id])
    try:
        image = image[0]["profile_pic"]
        binary_data = base64.b64decode(image) # Decode the string
    except:
        return "None"

    return Response(binary_data, mimetype='image/jpeg')



# Chat
@app.route("/inbox")
def inbox():
    my_id = execute_query("SELECT id from users WHERE username = %s;", [session["user_id"]])
    my_id = my_id[0]["id"]
    return render_template("chat/inbox.html", context={"my_id" : my_id})


@app.route("/chat/<int:channel_id>")
def chat(channel_id):
    # Check if GET method was receivied
    if channel_id == None:
        return "<h1> Open a chat </h1>"


    # Check if user has access to the channel
    channel_info = execute_query("SELECT * FROM channels WHERE id = %s;", [channel_id])
    user_id = execute_query("SELECT id from users WHERE username = %s;", [session["user_id"]])
    user_id = user_id[0]["id"]

    if channel_info[0]["user_a"] != user_id and channel_info[0]["user_b"] != user_id:
        return "<h1> Sorry, you dont have access to this channel </h1>"


    my_id = execute_query("SELECT id from users WHERE username = %s;", [session["user_id"]])
    my_id = my_id[0]['id']
    other_user_id = execute_query("SELECT (CASE WHEN user_a <> %s THEN user_a ELSE user_b END) AS other_user_id FROM channels WHERE id = %s; ", [my_id, channel_id])
    other_user_id = other_user_id[0]["other_user_id"]
    other_username = execute_query("SELECT username FROM users WHERE id = %s", [other_user_id])
    other_username = other_username[0]["username"]

    context = {
        "my_id" : my_id,
        "channel_id" : channel_id,
        "username" : other_username,
        "user_id" : other_user_id,
    }
    return render_template("chat/chat.html", context=context)


@app.route("/get_chats")
def get_chats():
    my_id = execute_query("SELECT id from users WHERE username = %s;", [session["user_id"]])
    my_id = my_id[0]["id"]
    query_output = execute_query("SELECT * from channels WHERE user_a = %s OR user_b = %s;", [my_id, my_id])

    data = []
    for channel in query_output: 
        if channel["user_a"] == my_id:
            username = execute_query("SELECT username from users WHERE id = %s;", [channel["user_b"]])
            data.append((channel["id"], channel["user_b"], username[0]["username"])) 
        else:
            username = execute_query("SELECT username from users WHERE id = %s;", [channel["user_a"]])
            data.append((channel["id"], channel["user_a"], username[0]["username"]))

    return jsonify(data)


@app.route("/get_messages", methods=["GET"])
def get_messages():
    channel_id = request.args.get("channel_id")
    query_output = execute_query("SELECT * from messages WHERE channel_id = %s ORDER BY time ASC;", [channel_id])

    return jsonify(query_output)


@app.route("/send_message", methods=["POST"])
def send_message():
    message = request.json.get("message")
    channel_id = request.json.get("channel_id")
    user_id = request.json.get("user_id")
    date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    #print("Channel:", channel_id, "\nUser:", user_id, "\nMessage:", message, "\nDate:", date)
    
    # Save the data into the database
    query_output = execute_query("INSERT INTO messages (channel_id, user_id, message, time) VALUES (%s, %s, %s, %s)", [channel_id, user_id, message, date])
    print(query_output)


    return jsonify(success=True)
