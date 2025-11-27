async function getSiteData(channelName) {
    let posts = [];
    try {
        // get the currently active container
        let curContainer = Array.from(document.querySelectorAll('.MasonryGrid-container.MediaGridV2-container'))
        // should only be one of them
        .filter((row) => row.closest('.LayerContext-layer-hidden') == null)[0];

        // cannot do .forEach as it iterates through it asynchronously
        // This would have us jumping all over the place and generally break it


        let backupAmount = 200;
        let delayAmount = 4000;
        let delayAddition = 2;
        let startOffset = 0;
        let noBackups = (startOffset == 0)
            ? 0
            : Math.floor((startOffset/backupAmount)-1);


        // +40 is required since it will otherwise have the offset amount loaded, on the current offset one, then not save any, which isn't ideal
        while(curContainer.childNodes.length < (startOffset > 0) ? (startOffset + 40) : 0) {
            console.log(`scrolling to: ${curContainer.childNodes.length}`);
            curContainer.childNodes[curContainer.childNodes.length -1].scrollIntoView();
            await sleep(2000);
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

            //* MAIN MEDIA SECTIOn
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
                : mediaElement.attributes.src;

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
                        return (row.classList.contains("BlockTextRendererV2-container"))
                            ? row.innerText
                            : `![](${row.querySelector('img,video').src})`;
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
                "main": mainMediaURL,
                "replies": postComments
            });


            // base case when testing
            // Will have some dynamic loading, some scrolling, good amount
            // if(i==100) break;

            if(i != 0 && i% backupAmount == 0) {
                let encodedPosts = "data:text/json;charset=utf8," + encodeURIComponent(JSON.stringify(posts));

                let tmpEl = document.createElement('a');
                tmpEl.setAttribute('href', encodedPosts);
                tmpEl.setAttribute("download", `export-${channelName}${backupAmount * noBackups}.json`);
                tmpEl.click();

                noBackups += 1;

                // reset it to save memory
                posts = [];
            }
        }

        // save whatever's left in the spout
        if ( posts.length != 0) {
            let encodedPosts = "data:text/json;charset=utf8," + encodeURIComponent(JSON.stringify(posts));

            let tmpEl = document.createElement('a');
            tmpEl.setAttribute('href', encodedPosts);
            tmpEl.setAttribute("download", `export-${channelName}Last.json`);
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
            tmpEl.setAttribute("download", `export-${channelName}Error.json`);
            tmpEl.click();
        console.log(posts);
        console.error(err);
    }
    

}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


