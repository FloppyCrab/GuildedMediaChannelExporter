async function getSiteData(channelName, startOffset = null, stopAfter = null) {
    let posts = [];
    try {
        // get the currently active container
        let curContainer = Array.from(document.querySelectorAll('.MasonryGrid-container.MediaGridV2-container'))
        // should only be one of them
        .filter((row) => row.closest('.LayerContext-layer-hidden') == null)[0];

        // cannot do .forEach as it iterates through it asynchronously
        // This would have us jumping all over the place and generally break it


        let backupAmount = 50;
        let delayAmount = 100;
        let delayAddition = 0.5;

        // +40 is required since it will otherwise have the offset amount loaded, on the current offset one, then not save any, which isn't ideal
        if(startOffset) {
            // while(curContainer.childNodes.length < (startOffset + backupAmount + 1)) {
            //     console.log(`scrolling to: ${curContainer.childNodes.length}`);
            //     curContainer.childNodes[curContainer.childNodes.length -1].scrollIntoView();
            //     await sleep(3000);
            // }
            await scrollToPost(curContainer, startOffset, backupAmount);
        } else {
            startOffset = 0;
        }

        if(stopAfter) {
            stopAfter = startOffset + stopAfter;
        } else {
            // very big number, no doubt won't get that far
            stopAfter = 1000000;
        }
        

        console.log(`scrolled with ${curContainer.childNodes.length} posts in view`);
        let allDownloaded = false;
        window.continueSiteData = true;

        while(!allDownloaded && window.continueSiteData) {
            let iterablePosts = Array.from(curContainer.childNodes).slice(startOffset, (startOffset + backupAmount));
            let tmp = await downloadRange(backupAmount, startOffset, delayAmount, delayAddition, channelName, iterablePosts, posts);
            tmp = null;
            if(posts[posts.length-1].postId >= (curContainer.length- 1))
                allDownloaded = true;

            startOffset += iterablePosts.length;
            // reset it to save memory
            posts = [];
            // window.continueSiteData = false;

            if(startOffset >= stopAfter) window.continueSiteData = false;
        }

        

        // save whatever's left in the spout
        if ( posts.length != 0) {
            let encodedPosts = "data:text/json;charset=utf8," + encodeURIComponent(JSON.stringify(posts));

            let tmpEl = document.createElement('a');
            tmpEl.setAttribute('href', encodedPosts);
            tmpEl.setAttribute("download", `ZZ-export-${channelName}Last.json`);
            tmpEl.click();

            tmpEl = null;
            
            // delete(tmpEl);
        }

        posts = null;
        curContainer = null;



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

        posts = null;
        tmpEl = null;

    }
}

async function scrollAndOpenPost(postNo) {
    let curContainer = Array.from(document.querySelectorAll('.MasonryGrid-container.MediaGridV2-container'))
        // should only be one of them
        .filter((row) => row.closest('.LayerContext-layer-hidden') == null)[0];

    await scrollToPost(curContainer, postNo, 1);

    curContainer.childNodes[postNo].childNodes[0].click();

    curContainer = null;
}

async function scrollToPost(curContainer, startOffset, backupAmount) {
    while(curContainer.childNodes.length < (startOffset + 1)) {
        console.log(`scrolling to: ${curContainer.childNodes.length}`);
        curContainer.childNodes[curContainer.childNodes.length -1].scrollIntoView();
        await sleep(3250);
    }
}

async function awaitMediaLoad(imgEl) {
    return new Promise(resolve => {
        imgEl.onload = resolve;
    });
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
    let req = await fetch(url).then((data) => data.blob()).then((blob) => {
        let newUrl = URL.createObjectURL(blob);
        let tmpEl = document.createElement("a");
        tmpEl.href = newUrl;
        tmpEl.download = name;
        tmpEl.click();
        URL.revokeObjectURL(url);
        // delete(tmpEl);
        // delete(blob);

        tmpEl = null;
        blob = null;
        newUrl - null;
    });

    req = null;
}

function sleep(ms) {
    return new Promise(resolve => {
        let timeout = setTimeout(() => {
            resolve();
            clearTimeout(timeout);
            timeout = null;
        }, ms);
    });
}

function waitForMediaLoad(element) {
    if(!['CANVAS', 'IMG', 'VIDEO', 'IFRAME'].includes(element.nodeName)) return;

    return new Promise((resolve, reject) => {
        let listener;
        switch (element.nodeName) {
            case "VIDEO":
                listener = element.addEventListener("canplay", (e) => {
                    resolve();
                });
                break;
            case "IMG":
                if(element.complete) {
                    resolve();
                    break;
                }
            default:
                listener = element.addEventListener("load", (e) => {
                    resolve();
                })
                break;
        }
        element.removeEventListener(listener);
    //     if(element.nodeName == "VIDEO") {
    //         element.addEventListener("canplay", (e) => {
    //             resolve();
    //         });
    //     }

    //     element.addEventListener('load',() => {
    //         resolve();
    //     });
    //     setTimeout(() => {
    //         if(element.complete) resolve();
    //         else reject("timeout");
    //     }, 500);
    });
}


async function downloadRange(backupAmount, startOffset, delayAmount, delayAddition, channelName, iterablePosts, posts) {
    // additionally curContainer should update the length of the children as it scrolls
    for (let i=0; i<Math.min(iterablePosts.length, backupAmount); i++) {
        // console.log(`beginning saving at ${curContainer.childNodes.length} posts`);
        let curItem = iterablePosts[i];
        curItem.scrollIntoView();
        curItem.childNodes[0].click();

        let overallIndex = (i + startOffset);

        // give it time to load the post, images are the issue, videos are able to be streamed
        // await sleep(delayAmount + (overallIndex * delayAddition));
        await sleep(250);
        console.log(`post ${i} of ${iterablePosts.length} in current batch`);

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
        await waitForMediaLoad(mediaElement);
        await sleep(250);
        if(["CANVAS", "IMG"].includes(mediaElement.nodeName)) {
            // console.log(mediaElement);
            // while(mediaElement.attributes?.src?.value.indexOf(".webp") != -1
            //     || mediaElement.src?.indexOf(".webp") != -1) await sleep(250);
            let stopWaiting = false;
            let timeout = setTimeout(() => {
                // console.log(mediaElement);
                // throw new Error("timed out waiting for the image to load");
                stopWaiting = true;
            }, 5000);
            if(mediaElement.nodeName == "CANVAS")
                while (!mediaElement.attributes.src.value.includes(".webp") && !stopWaiting) await sleep(250);
            if(mediaElement.nodeName == "IMG")
                while (!mediaElement.src.includes(".webp") && !stopWaiting) await sleep(250);
            // re-get the reference just in case
            if(stopWaiting) mediaElement = mainMediaSection.querySelector('video,img,canvas,iframe');

            // if(mediaElement.nodeName == "CANVAS") {
            //     // console.log("canvas");
            //     // console.log(mediaElement.attributes.src.value.indexOf(".webp"));
            //     // while(mediaElement.attributes.src.value.indexOf)
            // }
            // if(mediaElement.nodeName == "IMG") {
            //     console.log("img");
            //     console.log(mediaElement.src.indexOf(".webp"));
            // }

            clearTimeout(timeout);
            timeout = null;
        }
        // await sleep(delayAmount + Math.floor(overallIndex * delayAddition));
        if(mediaElement.nodeName == "VIDEO") mediaElement.pause();
        let mainMediaURL = (mediaElement.src)
            ? mediaElement.src
            // gifs are canvases with a custom attribute of src for some reason
            // rather than just being a img with an src of a gif, i don't get this
            : mediaElement.attributes.src.value;

        let attachmentName = "tmp";
        if(mediaElement.nodeName == "IFRAME") {
            attachmentName = mainMediaURL;
        } else {
            attachmentName = `${String(overallIndex).padStart(5,'0')}-${getMediaName(mainMediaURL)}`;
            await downloadMedia(mainMediaURL, attachmentName);
        }

        //* COMMENT SECTION
        let commentSection = document.querySelector('.RepliesAddon-container');
        let commentContainer = commentSection.querySelectorAll('.PostDisplayV2-container.PostDisplayV2-container-size-sm');

        let postComments = [];

        let mediaComments = commentSection.querySelectorAll("img,video,canvas");
        let loadPromises = [];
        mediaComments.forEach((el) => {
            loadPromises.push(waitForMediaLoad(el));
        });

        await Promise.all(loadPromises);
        loadPromises = null;
        mediaComments = null;

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
                        let commentMediaElement = row.querySelector('img,video,canvas');
                        let commentMediaURL = (commentMediaElement.nodeName == "CANVAS")
                            ? commentMediaElement.attributes.src.value
                            : commentMediaElement.src;
                        let commentMediaName = `${String(overallIndex).padStart(5,'0')}-${String(j).padStart(2,'0')}-${getMediaName(commentMediaURL)}`;
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
        // await sleep(500);

        // format it correctly
        posts.push({
            "postId": overallIndex,
            "createdBy": postCreator,
            "title": postTitle,
            "main": attachmentName,
            "replies": postComments
        });

        postCreator = null;
        postTitle = null;
        attachmentName = null;
        postComments = null;
        

        if(i==(iterablePosts.length-1)) {
            let encodedPosts = "data:text/json;charset=utf8," + encodeURIComponent(JSON.stringify(posts));

            let startingId = posts[0].postId;

            let fileName = `ZZ-export-${channelName}${String(startingId).padStart(5, '0')}.json`;
            console.log(`saving: ${fileName}`);

            let tmpEl = document.createElement('a');
            tmpEl.setAttribute('href', encodedPosts);
            tmpEl.setAttribute("download", fileName);
            tmpEl.click();

            encodedPosts = null;
            startingId = null;
            fileName = null;
            tmpEl = null;
        }

        // base case when testing
        // Will have some dynamic loading, some scrolling, good amount
        // if(i==1) break;
    }
}

