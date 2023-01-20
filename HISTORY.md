### Typescript issues

The first time I released my application, I bumped into the issue that it reached the memory limits.
Since I use free plans as much as possible it was a problem. Turns out `ts-node` consumes tons of RAM,
so I decided to compile all the code into JS. This allowed me to use 5 times less memory and live
under the 512mb limit (now it consumes ~100mb)

### First feedback (Added groups support)

During the first releases, I blocked the bot from adding to groups. I did not check how it works
in there and tried to turn such usage off. Nevertheless, some guy asked me if the bot works in
groups. I was inspired by this communication and modified the code, so it got less verbose in groups.
Now groups took a significant role in bot statistic.

### OGG 44.100Hz issue

Dealing with audio codecs in NodeJS is fun. You don't know what to expect next time. You barely
can handle errors. It just breaks the whole application. Interestingly, Google does not support
the most popular sample rate for OGG files. So I had to convert OGG files into WAV using the FFMPEG
engine. Now iPhone users are happy and can proceed with voice messages as well.

### Groups flooded the DB access

So I allowed the bot to be added to groups. The same day I got my first #worldisonfire. Turns
out I was querying the DB table each time some telegram message comes. This was an issue. In groups,
people write messages, and the bot does not answer (since most of them are not voice messages).
But DB requests were coming and coming. And yes, finally I got a 503 error from DB as I use a
free plan and there was a limitation on access requests. So I refactored the code, now it fires
the request only when it really needs some DB data.

### Unwrap log data in Loggly

Going through the logs I realized that I send data in form Loggly can't handle. It could not parse
additional data objects, so I couldn't find some particular value. I modified the log integration
code and now it looks fine, and I can look into issues easily.

### More logs

I could not understand the exact place where the issues come from. So I started following the
full-log-coverage strategy. In most places, I log when the function starts async action, then
I log the success result message and error result message as well. Now logs show detailed data,
and I can analyze that is going on.

### DB Raised duplications

I used some CRUD service as the database storage. It was okay (except, maybe the requests per
second limit on a free plan: see `Groups flooded the DB access` issue above) but somehow it
could create a duplicated row for the same chat id. It could happen once per week or so. So
I implemented duplication resolver with a simple strategy - if there are duplicated rows
appeared, then keep the old one as the real one and remove new duplications. Not an ideal
solution, but it works and is enough as I don't have enough information on how this might happen.

### Heroku free hours

Initially, I wanted to research how Heroku counts free hours. I knew the application could not
be up 24/7, so I wanted to figure out the exact way it works. First of all, I run an app daemon
that pings itself every minute. It helped to avoid app hibernation (Heroku stops applications
that were unused for 30 minutes). Next due to free plan limitations the application still can't
live the whole month, it has to be asleep for some time. Then I implemented so-called "replicas"
approach. This means that I create another application on Heroku and deploy the same code.
Doing this allowed me to run one app instance during the even days of the month, and the other
one during the odd days. That's it. After one month in production, I realized that Heroku sums
all applications hours in the account. So make my approach working I had to create a new Heroku
account. Configuration remained the same as described. Or you can **attach credit card** in the
account settings, and it will gain more free hours for your applications.

### Non-ZDD

Implementing the replica pool feature allowed me to get closer to ZDD deployments. Imagine
You have two replicas and only one is live. So we can deploy another one, so it will take
controls smoothly and without any downtime. Then you can deploy the first one. The only
thing here is to make sure which replica is live at the moment. It might take ~30 seconds
downtime when Heroku launches your NodeJS application, and it sets everything up.

### Telegram API

For quick started I picked `node-telegram-bot-api` package from npm. It (plus types lib)
made me fully equipped for any kind of API requests and responses. When the project got more
stable I decided to write the API client on my own. Thus, I decreased memory usage by ~20mb.
(memory consumption is really a metric for applications on free plans. Heroku offers 512mb).
Also, I made sure it is tested and works as expected.

### Typescript for the win

I would never be so confident in writing the code and implementing new features if there
would not be a thing like Typescript. It makes me feel so smooth and happy, I did not
write tests at all in first releases (so this is a startup situation lol). **Always enable
as many strict rules as possible** and then Typescript will cover your back. What an awesome
toolchain.

### Tests are must-have

Nevertheless, the project is getting bigger and bigger. It is almost impossible now to
write new stuff and keep everything working. So I picked Jest, Nock, and Supertest libs
to cover all cases I have. Now I have so-called smoke tests (actually kind of integration
tests) that cover critical flows in chats and groups in general. And, I do write unit
tests for new features. When I have some time, I cover the old code as well.

### Predict user language

As I wrote before, I re-implemented the Telegram API client and thus learned some
interesting details. One detail is that Telegram sends user client language. That is
super cool as I can use it. I added language detection so now Russian-speaking
customers have the bot set up in Russian from the beginning. They don't have to
change recognition language manually. At least, if they set Telegram application
interface language to Russian.

### Voice file mime-type

For some reason, sometimes Telegram fails to detect the correct mime-type of the
audio file. Imagine you expect `audio/ogg`, but it is actually `audio/mpeg`. This
thing was breaking the whole instance until it was fixed. I switched to use FFMpeg
codec instead of OPUS. Now it looks much more stable and promising.

### Clustered application

Okay, NodeJS might be single-threaded, but it has builtin tools for extending capacity
and manage load balancing. I used the `worker_thread` module before in another project. The
time has come, and I decided to try the `cluster` NodeJS module. One big advantage is that
all forks share the same port which is exactly my case. So I tweaked the initialization
code to reflect the thread number. This allowed me to avoid race conditions in all parts
of the application (Telegram API doesn't like it when the server floods it with the same
request multiple times in the same moment) and extended the capacity to receive HTTP
requests from the Telegram servers.

### Memory usage

Since I can run multiple cluster forks on the same instance, it became crucial
to follow the memory usage. I implemented a daemon that tracks and logs NodeJS memory
consumption. I also run only 2 cluster forks as I don't need more currently.

### Detect voice from audio attachments

It was a popular request, again. People wanted to send voice messages from Whatsapp
messenger right into the bot's direct messages (since I did not dive into Whatsapp
bot frameworks, they wanted to have a workaround). External voice message comes as
an audio attachment, not voice attachment. So I improved audio detection and now
scan Telegram message for voice attachment and if I did not find any, try to find
audio attachment. By the way, I have implemented more strict file format detection,
as a user can attach any audio, let's say audio/mp3 and so forth (I only support
_.ogg and _.opus at the moment).

### Switch to PostgreSQL

Time flies, and I reached the point where I needed to have a stable DB service.
The CRUD service I used before was okay, but I felt like I need to deal with
duplications and connection stability. So I migrated all data to the Postgres DB,
then run the instance to write info in sync into both places. It appeared to be
okay and working. Now I use Postgres as the source of truth, did not get any
duplication issues yet. Postgres will also allow me to scale connections since
it has Pool implementation. All parts of the application are now scalable.

### First donation!

My bot is a non-commercial project. But I have to pay. Google speech-to-text
engine is not free. I run all other parts under free plans, but at some point,
it might be required to scale the power. And that `DB flooding issue` had me
to pay for a plan that covers more requests per second to hold that #worldisonfire
problem. Now it is more stable. Anyway, I started campaigns for donation on
Patreon and Yandex.Money. You can subscribe or just send me some money by card.
I really appreciate the community I have built. I believe they will support
the project. And I already received my very first donation! What a feeling.

### Collect analytics

So far so good. I realized that I don't know how people use my bot. So I
decided to collect bot usages and behavior and analyze. Since this is a
backend NodeJS application, there are not many metrics to grab. I collect
all the messages and command executed. All data is anonymous (Telegram
doesn't send any sensitive info anyway). But I think it would be enough
at least to see how many people use the bot during the day and how they
do it.

### 1000+ installations in two months

Yes, we have reached **1000** installs in total! That's HUGE. It took me two
months and... maybe a week. It is just great. 1000+ installs, 1100+ voice
minutes were recognized. Almost all people came organically as there
was an only announcement in my empty twitter account lol. Great news!

### Downgrade audio sample rate

For some reason, wit.ai changed the flow and now 48kHz wav audio
can not be processed properly. The Suggestion was to downgrade the
sample rate to 16kHz and it works now. Took me a while to figure out why
it was not working and the documentation on the site updates without
any marks on what was updated, really. I guess it was a couple of weeks
the bot did not work. Big downtime. But now all is good.

### Chunked response

Last update wit.ai has implemented a feature to transcribe the voice
message in form of chunks. now the result is slowly progressing and responds
with some partial transcription results. Like, you receive the usual json response
as a chunk and with yet new iteration the transcription gets populated more and more.
I use axios to fire the request for transcription. And it silently fails to
parse the response, as it now looks like a string if concatenated json object, and
thus can not be parsed into something meaningful. To deal with this, I detect if axios
was able to parse the result from the string into object. If not, I am trying to find
the last chunk and parse data from there. Let's see how it will work in production.

### 12000+ installations after 16 months in production

I did not notice that we have reached 12k+ installs in 16 months! Simple amazing result.
What I love the most is that people tend to tell me if something goes wrong. So far
There was not any issues in my code but rather a communication problems with 3rd party
services. Also, one of my donation wallets stopped working. I guess I would go into
bitcoin in the near future, the donation does not work anyway. /shrug

### Increasing the voice duration up to 1,5 minutes

With new API wit.ai now able to recognise the voice messages up to 5 minutes! That's a
real deal! In fact, I want first to keep an eye on how it is progressing, and track the
average voice message duration in the analytics. So I set the limit up to 1,5 minutes for
now. Let's follow the stats and understand if we can go further. In the meantime, the
universal analytics from Google comes to end of life state, so I migrate to the brand
new Google Analytics 4. The proper set up will take some time. THis should give some
insights on how users interact with the bot.

### 29000+ installations!

We still online and making an outstanding effort service telegram people. That's an amazing
feeling! 2 years and almost 2 month we are online and almost hit 29000 installations.
Although I understand many people opted-out from using the bot, there is a quite a few
guys who live with me and my bot from the earlier days. Unfortunately, I don't have a lot
of capacity to extend the functionality at the moment. But what I do is I keep the bot
working (which is important) and also trying to get the opportunities when something is
happening around. I love these news that I can enable longer voice messages to be transformed
into text. Who knows what is next?

### Forum groups support

Recently Telegram introduced a concept of forum (or thread) groups. You can turn your group into
the list of threads, each thread represents a channel on its own. For Forum groups Telegram
introduced more metadata in the Message object. Now we have isTopicMessage flag that shows if we
are in such thread group. And also messageThreadId is the anchor for the particular thread in the
group. To support this we need to supply API payload with the threadId every time we want to answer
in the thread. I usually barely follow the API documentation updates and found the related exception
thanks to logs! Fo those who are (like me) did not have a clue what is changed, you might find
yourself catching the errors like "Bad Request: TOPIC_DELETED" which is a clear indicator someone
tries to use the bot in the forum group, but without the messageThreadId identifier Telegram fails
to distinguish the particular thread to answer.
We also celebrate 38000+ installs and 1000+ weekly active users! Omg this escalates quickly.

### Telegram message max length is 4096 chars

You could expect the messages in the social media platform have the length limit. Thi sis also true
for Telegram. It has the 4096 chars limit for a single message content. Why care? Back in the days
the voice message length was limited by 20 seconds, which is rather small. In the meantime, it means
we can never hit the text limit per message. Now we have a voice duration limit equal to 1,5 minutes!
It is still not that long, but I was able to catch the error in the logs that some message hit the
limit. With this commit, it should be fixed. We now split messages longer than 4096 characters into
chunks and send each chunk separately one by one.
As for the metrics, we went beyond 40000+ installs and floating around the 1200 WAU.
