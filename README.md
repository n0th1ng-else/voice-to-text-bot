<div>
    <a href="https://twitter.com/intent/follow?screen_name=n0th1ng_else" target="_blank" rel="noopener noreferrer">
        <img alt="Twitter Follow" src="https://img.shields.io/twitter/follow/n0th1ng_else?style=social">
    </a>
</div>

<div>
    <span>
        <a href="https://t.me/AudioMessBot" target="_blank">
            <img alt="Number of installs" src="https://img.shields.io/badge/installs-30000%2B-blueviolet"> 
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

<img src="/assets/botPic/botPic.png?raw=true" alt="Bot logo" height="50px" align="right">

This is the simple bot that converts voice into text.
I tried to review available public speech recognition services
and the results you can see below in the table.

# Techstack

- Typescript
- ExpressJS
- PostgreSQL
- Google Cloud API
- Google Analytics

# Service model

![Service model](/assets/diagram/diagram.png?raw=true "Full service model")

# Services overview

| Service provider                                                                                | Russian lang | Synchronous API | Duration limitation      | File upload     | Speed                   |
| ----------------------------------------------------------------------------------------------- | ------------ | --------------- | ------------------------ | --------------- | ----------------------- |
| [IBM Watson](https://www.ibm.com/cloud/watson-speech-to-text)                                   | no           | no              | N/A                      | Unknown         | Unknown                 |
| [Microsoft Azure](https://azure.microsoft.com/en-us/services/cognitive-services/speech-to-text) | no           | no              | N/A                      | Unknown         | Unknown                 |
| [Amazon AWS](https://aws.amazon.com/transcribe)                                                 | **yes**      | no              | Unlimited                | S3              | Minutes                 |
| [Google Cloud](https://cloud.google.com/speech-to-text)                                         | **yes**      | **yes**         | 1 minute<sup>\*[1]</sup> | Direct / GDrive | Instant<sup>\*[2]</sup> |
| [Wit.ai](https://wit.ai)                                                                        | **yes**      | **yes**         | 20 seconds               | Direct          | Instant                 |

- For direct upload
  <br/>
  1 Unlimited for asynchronous upload via Google Drive
  <br/>
  2 Takes a while for asynchronous upload via Google Drive
