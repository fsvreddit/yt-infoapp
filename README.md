This app can be used to:

* Create a comment on posts/comments containing Youtube links with information about the video (title, channel, publish date and runtime)
* Remove or filter posts/comments with video links that have over or under a given subscriber count

![Example comment](https://www.)

Example use cases:

* Providing information about YouTube videos so that users don't have to second-guess where a link goes (no accidental rickrolls!)
* Preventing spam by very small channels on subreddits where it is not welcome
* Preventing inappropriate submissions of videos from large Youtubers on subreddits dedicated to small Youtubers

When removing posts/comments, a custom removal reason can optionally be left.

## Bugs

At present, a reason isn't visible in the modqueue when filtering posts or comments to the modqueue. I'm going to need a fix from Admin to make this work. It's supposed to say the reason the post or comment was filtered.

## Source code

Youtube Information is open source under the BSD three-clause license. [You can find the source code on Github](https://github.com/fsvreddit/yt-info) (this repo will be made public once the app is).

## Fetch Domains

* youtube.googleapis.com: This app uses the Youtube API to find video information
