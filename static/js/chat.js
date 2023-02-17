window.addEventListener("load", function() {
    
    // Update Channels
    const container = document.getElementById("channels_container");

    const update_chats = () => {
        fetch("/get_chats")
            .then(response => response.json())
            .then(async data => {
                let channels = "";
                for (element in data) {
                    let channel_option = `
                        <a href = "/chat/${data[element][0]}" style = "text-decoration: none;"> 
                            <div class = "selected_channel_option">  
                                <div class = "channel_option_image">
                                    <img src="${await get_img(data[element][1])}" alt="Profile Image"></img> 
                                </div>
                                <div class = "channel_option_username">
                                    ${data[element][2]} 
                                </div>
                            </div> 
                        </a>`;
                    channels += channel_option;
                }
                container.innerHTML = channels;
        });
    };

    // Execute update_chats each 2 seconds (2000 ms)
    update_chats();
    setInterval(update_chats, 2000);
    



    // Update messages
    const msg_container = document.getElementById("messages_container");
    const channel_id = document.getElementById("channel_id").getAttribute('value');
    const my_id = parseInt(document.getElementById("user_id").getAttribute("value"));

    const update_messages = () => {
        fetch(`/get_messages?channel_id=${channel_id}`)
            .then(response => response.json())
            .then(data => {
                msg_container.innerHTML = "";
                let lista = data;
                for (element in lista) {
                    let message_format;
                    if (lista[element].user_id === my_id) {
                        message_format = `
                            <div class = "ms_container my_message_container_style"> 
                                <p style="text-align: right;"><strong> ${lista[element].message} </strong></p>
                                <p class = "my_message_time"> ${lista[element].time} <p> 
                            </div>`;
                    } else {
                        message_format = `
                            <div class = "ms_container message_container_style"> 
                                <p style="text-align: left;"><strong> ${lista[element].message} </strong></p>
                                <p class = "message_time"> ${lista[element].time} <p> 
                            </div>`;
                    }    
                    msg_container.innerHTML += message_format;
                }
        });
    };

    // Execute update_messages each second
    update_messages();
    setInterval(update_messages, 1000);
    


    
    // Send Messages
    const send_button = this.document.getElementById("send_button");

    send_button.addEventListener("click", (event) => {

        // Get data from html form
        //const message_input = document.getElementById("message_input");
        const message = document.getElementById("message_input").value;
        //const message = message_input.value;

        const channel_id = document.getElementById("channel_id").getAttribute("value");
        const user_id = document.getElementById("user_id").getAttribute("value");

        // Send data to server
        fetch("/send_message", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: message,
                channel_id: channel_id,
                user_id: user_id,
            })
        }).then(response => {
            // Server response
            console.log(response);
        }).catch(error => {
            console.error(error);
        });

        // Clear the input message field 
        message_input.value = "";

        // Update the messages container
        let message_format = `
            <div class = "ms_container my_message_container_style"> 
                <p style="text-align: right;"><strong> ${message} </strong></p>
                <p class = "my_message_time"> Now <p> 
            </div>`;

        msg_container.innerHTML += message_format;

    });
    

    // Get profile images
    function get_img(id) {
        return fetch(`/get_image/${id}`)
            .then(response => response.blob())
            .then(data => {
                if (data.type != "image/jpeg"){
                    return "/static/images/default_profile_pic.png"
                }
                let img_url = URL.createObjectURL(data);
                return img_url;
            });
    }

});
