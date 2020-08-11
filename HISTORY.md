### Typescript issues

First time I released my application, I bumped into the issue that it reached the memory limits.
Since I use free plans as much as possible it was a problem. Turns out `ts-node` consumes tons of RAM,
so I decided to compile all the code into JS. This allowed me to use 5 times less memory and live
under the 512mb limit (now it consumes ~100mb)

### First feedback (Added groups support)

During first releases I blocked the bot from adding to groups. I did not check how it works in there
and tried to turn such usage off. Nevertheless, some guy asked me if the bot works in groups. I was
inspired by this communication and modified the code, so it got less verbose in groups. Now groups
took significant role in bot statistic.

### OGG 44.100Hz issue

Dealing with audio codecs in NodeJS is fun. You don't know what to expect next time. You barely can
handle errors. It just breaks whole application. It is interesting that Google does not support
the most popular sample rate for OGG files. So I had to convert OGG files into WAV using the FFMPEG
engine. Now iphone users are happy and can proceed with voice messages as well.

### Groups flooded the DB access

So I allowed bot to be added to groups. The same day I got my first #worldisonfire. Turns out I was
querying the DB table each time some telegram message comes. This was an issue. In groups people
write messages, and the bot does not answer (since most of them are not voice messages). But DB
requests were coming and coming. And yes, finally I got 503 error from DB as I use free plan and
there was a limitation on access requests. So I refactored the code, now it fires the request only
when it really needs some DB data.

### Unwrap log data in Loggly

Going through the logs I realized that I send data in form Loggly can't handle. It could not parse
additional data object, so I couldn't find by particular value. I modified log integration code
and now it looks fine, and I can look into issues easily.

### More logs

I could now understand the exact place where the issues come from. So I started following the
full-log-coverage strategy. In most places I log when the function starts async action, then
I log success result and error result as well. Now logs show detailed data, and I can analyze
that is going on.
