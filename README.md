This app can be used to:

* Create a comment on posts/comments containing Youtube links with information about the video (title, channel, publish date and runtime)
* Remove or filter posts/comments with video links that have over or under a given subscriber count
* Remove or filter posts/comments with video links that are over or under a given duration

![Example comment](https://raw.githubusercontent.com/fsvreddit/yt-infoapp/refs/heads/main/readme_images/examplecomment.png)

Example use cases:

* Providing information about YouTube videos so that users don't have to second-guess where a link goes (no accidental rickrolls!)
* Preventing spam by very small channels on subreddits where it is not welcome
* Preventing inappropriate submissions of videos from large Youtubers on subreddits dedicated to small Youtubers
* Preventing inappropriate submissions of short videos on subreddits dedicated to long form content (or long videos on channels dedicated to short form content)

When removing posts/comments, a custom removal reason can optionally be left.

## Bugs

At present, a reason isn't visible in the modqueue when filtering posts or comments to the modqueue. I'm going to need a fix from Admin to make this work. It's supposed to say the reason the post or comment was filtered.

## Change History

### v1.0.1

* Mitigate against duplicate actions if the Developer Platform is having issues

## Source code

Youtube Information is open source under the BSD three-clause license. [You can find the source code on Github](https://github.com/fsvreddit/yt-info).

## Fetch Domains

* youtube.googleapis.com: This app uses the Youtube API to find video information
