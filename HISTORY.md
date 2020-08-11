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

I could not understand the exact place where the issues come from. So I started following the
full-log-coverage strategy. In most places I log when the function starts async action, then
I log success result and error result as well. Now logs show detailed data, and I can analyze
that is going on.

### DB Raised duplications

I used some CRUD service as the database storage. It was okay (except, maybe the requests per
second limit on a free plan: see `Groups flooded the DB access` issue above) but somehow it
could create a duplicated row for the same chat id. It could happen once per week or so. So
I implemented duplication resolver with simple strategy - if there are duplicated rows appeared,
then keep the old one as the real one and remove new duplications. Not an ideal solution, but
it works and is enough as I don't have enough information on how this might happen.

### Heroku free hours

Initially, I wanted to research how Heroku counts free hours. I knew the application could not
be up 24/7, so I wanted to figure out the exact way it works. First of all, I run an app daemon
that pings itself every minute. It helped to avoid app hibernation (Heroku stops applications
that were unused for 30 minutes). Next due to free plan limitations the application still can't
live whole month, it has to be asleep for some time. Then I implemented so called "replicas"
approach. This means that I create another application on Heroku and deploy the same code.
Doing this allowed me to run one app instance during the even days of the month, and the other
one during the odd days. That's it. After one month in production I realized that Heroku sums
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
made me fully equipped for any kinds of api requests and responses. When project got more
stable I decided to write the api client on my own. Thus, I decreased memory usage by ~20mb.
(memory consumption is really a metric for applications on free plans. Heroku offers 512mb).
Also, I made sure it is tested and works as expected.

### Typescript for the win

I would never be so confident in writing the code and implementing new features, if there
would not be the thing like Typescript. It makes me feel so smooth and happy, I did not
write tests at all in first releases (so this is a startup situation lol). **Always enable
as much strict rules as possible** and then Typescript will cover your back. What an awesome
toolchain.

### Tests are must-have

Nevertheless, the project is getting bigger and bigger. It is almost impossible now to
write new stuff and keep everything working. So I picked Jest, Nock and Supertest libs
to cover all cases I have. Now I have so-called smoke tests (actually kind of integration
tests) that cover critical flows in chats and groups in general. And, I do write unit
tests for new features. When I have some time, I cover old code as well.
