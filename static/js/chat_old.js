
// Update in real time when user send message
const msg_form = document.getElementById("form_submit");
const msg_container = document.getElementById("messages_container");
msg_form.addEventListener("submit", (event) => {
    event.preventDefault();
    const target_data = event.target;
    const form_data = new FormData(target_data);
    const xhr = new XMLHttpRequest();
    const end_point = msg_form.getAttribute("action");
    const method = msg_form.getAttribute("method");
    xhr.open(method, end_point);
    xhr.responseType = 'json';
    xhr.setRequestHeader("HTTP_X_REQUESTED_WITH", "XMLHttpRequest");
    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    var current = new Date();
    xhr.onload = () => {
        console.log(xhr.status, xhr.response);
        if (xhr.status === 201) {
            const ResponseData = xhr.response;
            let actual_message = msg_container.innerHTML;
            actual_message += `<div class = "ms_container my_message_container_style"> <p style="text-align: right;"><strong> ${(ResponseData.message).replace(/</g,"&lt;")} </strong></p> <p class = "my_message_time"> Now <p> </div>`;
            msg_container.innerHTML = actual_message;
            form_submit.reset();
        } else if (xhr === 400) {
            console.log(xhr.response);
        } else {
            alert("Error");
        }
    }
    xhr.send(form_data);
});

// Update in real time looking for new messages
var number_of_messages = 0;
$(document).ready(function() {
    setInterval(function() {
        $.ajax({
            type:"GET",
            url: "{% url 'getMessages' %}",
            success: function(response) {
                $("#messages_container").empty();
                for (var key in response.messages) {
                    if (response.messages[key].channel === "{{object.id}}") {
                        var message_time = changeTimeFormat(response.messages[key].time);
                        if (response.messages[key].user__username === "{{user}}") {
                            var temp = `<div class = "ms_container my_message_container_style"> <p style="text-align: right;"><strong> ${(response.messages[key].text).replace(/</g,"&lt;")} </strong></p> <p class = "my_message_time"> ${message_time} <p> </div>`;
                        } else {
                            var temp = `<div class = "ms_container message_container_style"> <p><strong> ${(response.messages[key].text).replace(/</g,"&lt;")} </strong></p> <p class = "message_time"> ${message_time} <p> </div>`;
                        }
                        $("#messages_container").append(temp);
                    }
                }
                var updated_number_of_messages = Object.keys(response.messages).length;
                var list_of_messages = [number_of_messages, updated_number_of_messages];
                if (list_of_messages[0] != list_of_messages[1]) {
                    number_of_messages = updated_number_of_messages;
                    scrollDown();
                }
            }, 
            error: function(response) {
                alert("Error sending the message, try later");
            }
        });
    },1000);
});


function changeTimeFormat(time) {
    var date = "";
    var hour = "";
    for (var i = 0; i < time.length; i++){
        if (i <= 9 && time.charAt(i) != "T") {
            date += time.charAt(i);
        } else if (time.charAt(i) != "T" && i <= 15) {
            hour += time.charAt(i);
        }
    }
    var total_time = hour + " " + date;
    return total_time;
}

function showChannelDetails() {
    alert("Channel ID: {{object.id}} \nUsers:  {% for user in object.userchannel_set.all %} {{ user.user }} {% endfor %} ");
}

function scrollDown() {
    var objDiv = document.getElementById("messages_container");
    objDiv.scrollTop = objDiv.scrollHeight;
}

// Update chats in real time
$(document).ready(function() {
    setInterval(function() {
        $.ajax({
            type:"GET",
            url: "{% url 'getChannels' %}",
            success: function(response) {
                if (Object.keys(response.channels).length != 0) {
                    $("#channels_container").empty();        
                    for (var key in response.channels) {
                        var name = response.channels[key][0];
                        var image = response.channels[key][1];
                        if (name == "{{username}}") {
                            var channel_option = `
                            <a href = "/profiles/${name}" style = "text-decoration: none;"> 
                                <div class = "selected_channel_option">  
                                    <div class = "channel_option_image">
                                        <img src="{{assets}}/images/${image}"></img> 
                                    </div>
                                    <div class = "channel_option_username">
                                        ${name} 
                                    </div>
                                </div> 
                            </a>`;    
                        } else {
                            var channel_option = `
                            <a href = "/ms/${name}" style = "text-decoration: none;"> 
                                <div class = "channel_option">  
                                    <div class = "channel_option_image">
                                        <img src="{{assets}}/images/${image}"></img> 
                                    </div>
                                    <div class = "channel_option_username">
                                        ${name} 
                                    </div>
                                </div> 
                            </a>`;  
                        }
                        $("#channels_container").append(channel_option); 
                    }   
                } else {
                    $("#channels_container").empty();
                    $("#channels_container").append("No chats yet...");
                }
            }, 
            error: function(response) {
                alert("Error loading your chats, try again later");
            }
        });
    },1000);
});