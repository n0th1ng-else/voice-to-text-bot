# Telegram Bot Converts Voice Messages Into Text

This is the simple bot that converts voice into text. 
I tried to review available public speech recognition services 
and the results you can see below in the table.

# Services overview

| Service provider | Russian lang | Synchronous API | Duration limitation     | File upload     | Speed                  |
| ---------------- | ------------ | --------------- | ----------------------- | --------------- | ---------------------- |
| IBM Watson       | no           | no              | N/A                     | Unknown         | Unknown                |
| Microsoft Azure  | no           | no              | N/A                     | Unknown         | Unknown                |
| Amazon AWS       | **yes**      | no              | Unlimited               | S3              | Minutes                |
| Google Cloud     | **yes**      | **yes**         | 1 minute<sup>*[1]</sup> | Direct / GDrive | Instant<sup>*[2]</sup> |

* For direct upload 
<br/>
1 Unlimited for asynchronous upload via Google Drive
<br/>
2 Takes a while for asynchronous upload via Google Drive
