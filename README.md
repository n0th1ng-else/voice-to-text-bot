<img alt="Twitter Follow" src="https://img.shields.io/twitter/follow/n0th1ng_else?style=social">
<div>
    <span>
        <img alt="Number of installs" src="https://img.shields.io/badge/installs-200%2B-blueviolet"> 
    </span>
    <span>
        <img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/n0th1ng-else/voice-to-text-bot"> 
    </span>
    <span>
        <img alt="Sonar Violations (long format)" src="https://img.shields.io/sonar/violations/n0th1ng-else_voice-to-text-bot?format=long&server=https%3A%2F%2Fsonarcloud.io"> 
    </span>
    <span>
        <img alt="Sonar Quality Gate" src="https://img.shields.io/sonar/quality_gate/n0th1ng-else_voice-to-text-bot?server=https%3A%2F%2Fsonarcloud.io"> 
    </span>
</div>

# Telegram Bot Converts Voice Messages Into Text

This is the simple bot that converts voice into text.
I tried to review available public speech recognition services
and the results you can see below in the table.

# Techstack

- Typescript
- ExpressJS
- Google Cloud API

# Service model

# Services overview

| Service provider | Russian lang | Synchronous API | Duration limitation      | File upload     | Speed                   |
| ---------------- | ------------ | --------------- | ------------------------ | --------------- | ----------------------- |
| IBM Watson       | no           | no              | N/A                      | Unknown         | Unknown                 |
| Microsoft Azure  | no           | no              | N/A                      | Unknown         | Unknown                 |
| Amazon AWS       | **yes**      | no              | Unlimited                | S3              | Minutes                 |
| Google Cloud     | **yes**      | **yes**         | 1 minute<sup>\*[1]</sup> | Direct / GDrive | Instant<sup>\*[2]</sup> |

- For direct upload
  <br/>
  1 Unlimited for asynchronous upload via Google Drive
  <br/>
  2 Takes a while for asynchronous upload via Google Drive
