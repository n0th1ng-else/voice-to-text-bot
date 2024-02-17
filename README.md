<div>
    <a href="https://twitter.com/intent/follow?screen_name=n0th1ng_else" target="_blank" rel="noopener noreferrer">
        <img alt="Twitter Follow" src="https://img.shields.io/twitter/follow/n0th1ng_else?style=social">
    </a>
</div>

<div>
    <span>
        <a href="https://t.me/AudioMessBot" target="_blank">
            <img alt="Number of installs" src="https://img.shields.io/badge/installs-125k%2B-blueviolet"> 
        </a>
    </span>
    <span>
        <a href="https://github.com/n0th1ng-else/voice-to-text-bot/releases">
            <img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/n0th1ng-else/voice-to-text-bot"> 
        </a>
    </span>
    <span>
        <a href="https://sonarcloud.io/project/issues?id=n0th1ng-else_voice-to-text-bot&resolved=false" target="_blank">
            <img alt="Sonar Violations (long format)" src="https://img.shields.io/sonar/violations/n0th1ng-else_voice-to-text-bot?format=long&server=https%3A%2F%2Fsonarcloud.io"> 
        </a>
    </span>
    <span>
        <a href="https://sonarcloud.io/dashboard?id=n0th1ng-else_voice-to-text-bot" target="_blank">
            <img alt="Sonar Quality Gate" src="https://img.shields.io/sonar/quality_gate/n0th1ng-else_voice-to-text-bot?server=https%3A%2F%2Fsonarcloud.io"> 
        </a>
    </span>
    <span>
        <a href="https://sonarcloud.io/component_measures?id=n0th1ng-else_voice-to-text-bot&metric=coverage&view=list" target="_blank">
            <img alt="Sonar Coverage" src="https://img.shields.io/sonar/coverage/n0th1ng-else_voice-to-text-bot?server=https%3A%2F%2Fsonarcloud.io">
        </a>
    </span>
</div>

# Telegram Bot Converts Voice Messages Into Text

<p align="center">
  <img src="assets/v2/previewPic.png" alt="Bot logo" height="150px">
</p>

This is the simple bot that converts voice into text.
I tried to review available public speech recognition services
and the results you can see below in the table.

# Tech Stack

- [Typescript](https://www.typescriptlang.org/)
- [Fastify](https://fastify.dev/)
- [Axios](https://axios-http.com/)
- [PostgreSQL](https://node-postgres.com/)
- Google Analytics
- [Amplitude](https://amplitude.com/)

# Service model

```mermaid
flowchart BT
  subgraph tg[Telegram]
    voice[Voice message]
    audio[Audio]
    video[Video note]
    text[Text message]
    bot[AudioMessBot API]
  end
  subgraph cluster[Replicas]
    r1{{Replica 1}}
    ar{{Active replica}}
    r2{{Replica N}}
  end
  voice-->bot
  audio-->bot
  video-->bot
  bot-->text
  bot---ar
  ar---db[(PSQL\nDatabase)]
  ar---cloud((Cloud API provider))
```

# Services overview

| Service provider                                                                                | Russian lang | Synchronous API | Duration limitation      | File upload     | Speed                   |
| ----------------------------------------------------------------------------------------------- | ------------ | --------------- | ------------------------ | --------------- | ----------------------- |
| [IBM Watson](https://www.ibm.com/cloud/watson-speech-to-text)                                   | no           | no              | N/A                      | Unknown         | Unknown                 |
| [Microsoft Azure](https://azure.microsoft.com/en-us/services/cognitive-services/speech-to-text) | no           | no              | N/A                      | Unknown         | Unknown                 |
| [Amazon AWS](https://aws.amazon.com/transcribe)                                                 | **yes**      | no              | Unlimited                | S3              | Minutes                 |
| [Google Cloud](https://cloud.google.com/speech-to-text)                                         | **yes**      | **yes**         | 1 minute<sup>\*[1]</sup> | Direct / GDrive | Instant<sup>\*[2]</sup> |
| [Wit.ai](https://wit.ai)                                                                        | **yes**      | **yes**         | 5 minutes                | Direct          | Instant                 |

- For direct upload
  <br/>
  <sup>1</sup> Unlimited for asynchronous upload via Google Drive
  <br/>
  <sup>2</sup> Takes a while for asynchronous upload via Google Drive
