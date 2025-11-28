async function getSiteData(channelName, startOffset = null) {
    let posts = [];
    try {
        // get the currently active container
        let curContainer = Array.from(document.querySelectorAll('.MasonryGrid-container.MediaGridV2-container'))
        // should only be one of them
        .filter((row) => row.closest('.LayerContext-layer-hidden') == null)[0];

        // cannot do .forEach as it iterates through it asynchronously
        // This would have us jumping all over the place and generally break it


        let backupAmount = 50;
        let delayAmount = 4000;
        let delayAddition = 1;

        // +40 is required since it will otherwise have the offset amount loaded, on the current offset one, then not save any, which isn't ideal
        if(startOffset) {
            while(curContainer.childNodes.length < (startOffset + 40)) {
                console.log(`scrolling to: ${curContainer.childNodes.length}`);
                curContainer.childNodes[curContainer.childNodes.length -1].scrollIntoView();
                await sleep(4000);
            }
        } else {
            startOffset = 0;
        }
        

        console.log(`scrolled with ${curContainer.childNodes.length} posts in view`);

        // additionally curContainer should update the length of the children as it scrolls
        for (let i=startOffset; i<curContainer.childNodes.length; i++) {
            // console.log(`beginning saving at ${curContainer.childNodes.length} posts`);
            let curItem = curContainer.childNodes[i];
            curItem.scrollIntoView();
            curItem.childNodes[0].click();

            // we should now be in the individual post context
            // but give it half a second to load anyway

            //!! up it to two seconds since images seem to be set as a data:/image
            //! up to five seconds so it can load properly
            //! down to four seconds to save an hour and a half
            await sleep(delayAmount + (i * delayAddition));
            console.log(`post ${i} of ${curContainer.childNodes.length} currently loaded`);

            //* CREATED BY
            let postDetails = document.querySelector('.MediaInfoPane-metadata');
            let postCreator = postDetails.querySelector('.TeamWidgetProfileDetails-name').textContent;

            //* TITLE
            // innerText as it might have linebreaks
            let postTitleElement = postDetails.querySelector('.MediaTitleDescription-description');
            let postTitle = (postTitleElement)
                ? postTitleElement.innerText
                : "";

            //* MAIN MEDIA SECTION
            let mainMediaSection = document.querySelector('.MediaPreviewer-container.MediaSplitView-preview');
            // let mediaElement = (mainMediaSection.classList.contains('MediaPreviewer-container-is-raw-video'))
            //     ? mainMediaSection.querySelector('video')
            //     : mainMediaSection.querySelector('img,canvas');

            let mediaElement = mainMediaSection.querySelector('video,img,canvas,iframe');



            if (mediaElement == null) throw new Error(`Issue with element: ${mainMediaSection}`);
            let mainMediaURL = (mediaElement.src)
                ? mediaElement.src
                // gifs are canvases with a custom attribute of src for some reason
                // rather than just being a img with an src of a gif, i don't get this
                : mediaElement.attributes.src.value;

            let attachmentName = "tmp";
            if(mediaElement.nodeName == "iframe") {
                attachmentName = mainMediaURL;
            } else {
                attachmentName = getMediaName(mainMediaURL);
                await downloadMedia(mainMediaURL, attachmentName);
            }

            //* COMMENT SECTION
            let commentSection = document.querySelector('.RepliesAddon-container');
            let commentContainer = commentSection.querySelectorAll('.PostDisplayV2-container.PostDisplayV2-container-size-sm');

            let postComments = [];

            // Iterate through all the comments, this will also need to be done synchronously
            for(let j=0; j<commentContainer.length; j++) {
                let commentCreator = commentContainer[j].querySelector('.TeamWidgetProfileDetails-name-actions').textContent;
                let commentMessage = Array.from(commentContainer[j].querySelectorAll('.BlockTextRendererV2-container,.MediaRendererV2-container'))
                    // .map((row) => row.innerText)
                    .map((row) => {

                        if(row.classList.contains("BlockTextRendererV2-container")) {
                            // text comment
                            return row.innerText
                        } else {
                            let commentMediaURL = row.querySelector('img,video').src;
                            let commentMediaName = getMediaName(commentMediaURL);
                            // map doesn't work asyncronously
                            downloadMedia(commentMediaURL, commentMediaName);
                            return `![](${commentMediaName})`;
                        }

                        // let commentMediaName = getMediaName()
                        // downloadMedia()

                        // return (row.classList.contains("BlockTextRendererV2-container"))
                        //     ? row.innerText
                        //     : `![](${row.querySelector('img,video').src})`;
                    })
                    .reduce((acc,val) => `${acc}\n${val}`);


                postComments.push({ "createdBy": commentCreator, message: commentMessage });
            }

            // wait another 500 milliseconds just in case
            await sleep(500);

            // format it correctly
            posts.push({
                "postId": i,
                "createdBy": postCreator,
                "title": postTitle,
                "main": attachmentName,
                "replies": postComments
            });


            

            if((i > 1) && (i % backupAmount) == (backupAmount-1)) {
                let encodedPosts = "data:text/json;charset=utf8," + encodeURIComponent(JSON.stringify(posts));

                let startingId = posts[0].postId;

                let tmpEl = document.createElement('a');
                tmpEl.setAttribute('href', encodedPosts);
                tmpEl.setAttribute("download", `ZZ-export-${channelName}${startingId}.json`);
                tmpEl.click();

                // reset it to save memory
                posts = [];
            }

            // base case when testing
            // Will have some dynamic loading, some scrolling, good amount
            // if(i==1) break;
        }

        // save whatever's left in the spout
        if ( posts.length != 0) {
            let encodedPosts = "data:text/json;charset=utf8," + encodeURIComponent(JSON.stringify(posts));

            let tmpEl = document.createElement('a');
            tmpEl.setAttribute('href', encodedPosts);
            tmpEl.setAttribute("download", `ZZ-export-${channelName}Last.json`);
            tmpEl.click();
        }



        // let URI = encodeURI(JSON.stringify(posts));
        // window.open(URI);
    }
    catch(err) {
        // save what we can
        let encodedPosts = "data:text/json;charset=utf8," + encodeURIComponent(JSON.stringify(posts));

            let tmpEl = document.createElement('a');
            tmpEl.setAttribute('href', encodedPosts);
            tmpEl.setAttribute("download", `ZZ-export-${channelName}Error.json`);
            tmpEl.click();
        console.log(posts);
        console.error(err);
    }
    

}

function getMediaName(mainMediaURL) {
    return (mainMediaURL.includes("gldcdn.com"))
            ? (mainMediaURL.includes("https://cdn.gldcdn.com/ContentMedia"))
                ? (mainMediaURL.includes("https://cdn.gldcdn.com/ContentMediaGenericFiles/"))
                    ? mainMediaURL.split("ContentMediaGenericFiles/")[1].split("?")[0]
                    : mainMediaURL.split("ContentMedia/")[1].split("?")[0]
                : mainMediaURL.split("MediaChannelUpload/")[1].split("?")[0]
            : mainMediaURL.split("/").pop();
}

async function downloadMedia(url, name) {
    await fetch(url).then((data) => data.blob()).then((blob) => {
        const newUrl = URL.createObjectURL(blob);
        const tmpEl = document.createElement("a");
        tmpEl.href = newUrl;
        tmpEl.download = name;
        tmpEl.click();
        URL.revokeObjectURL(url);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


