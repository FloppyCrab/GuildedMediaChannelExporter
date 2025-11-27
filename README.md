# GuildedMediaChannelExporter
A tool to scrape data from guilded media channels, since their exporter works incorrectly on media channels

## Configuration
there are several variables near the top of the program you can change.
- backupAmount - This is how many posts it will iterate through before triggering a save of the JSON data and clearing the array
- delayAmount - This is how long it will wait for the post to load before grabbing the data
  - I have found that reducing it below 4000ms may sometimes not get the URl, but a data:/*hex strings* which was not ideal for what i wanted.
- delayAddition - this is how many milliseconds of delay to add for each post, default is 2. This is to work with the added lag of having bigger media channels loaded all at once. 2ms seemed to work for me.
- startOffset - If there's an error/you stop it after a save, this can be set for the program to skip this number of posts before it starts running again

## Usage
- Login to your guilded account in a browser
- Open the browser console, either pressing F12 or right clicking -> Inspect Element then clicking the console tab in the pane that opens
- Copy the entire JS file and paste it into the browser console
- Type getSiteData("name-of-channel")
- Leave that tab running, it will iterate through every post and grab the relevant data

## Output
The program outputs to a JSON file, this will be saved every 200 posts (configurable by backupAmount variable)
the JSON format is as follows:
```json
{
  "createdBy": "userName",
  "title": "post title",
  "main": "url of the post",
  "replies": [
    {
      "createdBy": "comment creator",
      "message": "the comment message"
    }
  ]
}
```

images and videos posted into comments will also be saved

## Downloading the media
This will be a separate NodeJS program that will be uploaded once finished
