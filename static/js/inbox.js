window.addEventListener("load", async function() {

    // Update Channels
    const container = document.getElementById("channels_container");
    
    const update_chats = () => {
        fetch("/get_chats")
            .then(response => response.json())
            .then(async data => {
                let channels = "";
                for (element in data) {
                    let channel_option = `
                        <div class = "inbox"> 
                            <a href = "/chat/${data[element][0]}">
                                <div class = "channel_option"> 
                                    <div class = "channel_option_image">
                                        <img src="${await get_img(data[element][1])}"></img>
                                    </div>
                                    <div class = "channel_option_username">
                                        ${data[element][2]} 
                                    </div>
                                </div>
                            </a>
                        </div>`;
                    channels += channel_option;
                }
                container.innerHTML = channels;
        });
    };

    // Execute update_chats each 4 seconds (4000 ms)
    update_chats();
    setInterval(update_chats, 4000);

    
    // Get the profile image for each user
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
