const AWS = require("aws-sdk");
const fetch = require("node-fetch");
const { getWav } = require("../ogg");
const { writeOutput } = require("../logger");

class AWSProvider {
  constructor(environmentVars) {
    writeOutput("Using AWS");
    AWS.config.update({
      region: environmentVars.AWS_BUCKET_REGION,
      credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: environmentVars.AWS_POOL_ID,
      }),
    });

    this.bucket = environmentVars.AWS_BUCKET;
    this.storage = new AWS.S3();
    this.service = new AWS.TranscribeService();
  }

  transformToText(fileLink, data) {
    writeOutput("Starting process for", fileLink);
    const name = `${data.file_unique_id}.wav`;
    return this.getJob(name)
      .then((data) => {
        if (data.isExists) {
          writeOutput("Job exists. skipping");
          return this.getJobWithDelay(name, data.job);
        }

        return this.processFile(fileLink, name);
      })
      .then((job) => fetch(job.TranscriptionJob.Transcript.TranscriptFileUri))
      .then((translationData) => translationData.json())
      .then((translationData) => this.cleanStorage(translationData, name))
      .then((text) => {
        writeOutput(`Job ${name} completed`);
        return text;
      });
  }

  processFile(fileLink, name) {
    return getWav(fileLink)
      .then((file) => this.uploadToS3(name, file))
      .then((info) => this.convertToText(name, info.Location))
      .then((info) => this.getJobWithDelay(name, info));
  }

  unpackTranscription(translationData) {
    const transcripts = translationData.results.transcripts;
    if (!transcripts || !transcripts.length) {
      throw new Error("Unable to convert into text");
    }

    return Promise.resolve(transcripts[0].transcript);
  }

  cleanStorage(translationData, name) {
    return this.deleteFromS3(name)
      .then(() => this.removeTranscriptionJob(name))
      .then(() => this.unpackTranscription(translationData));
  }

  getJobWithDelay(name, job) {
    writeOutput("Scheduling job", name);
    if (job.TranscriptionJob.TranscriptionJobStatus !== "IN_PROGRESS") {
      return Promise.resolve(job);
    }

    return new Promise((resolve) => setTimeout(() => resolve(), 1000))
      .then(() => this.getJob(name))
      .then((info) => this.getJobWithDelay(name, info.job));
  }

  uploadToS3(name, file) {
    writeOutput("Uploading to S3", name);
    return new Promise((resolve, reject) => {
      this.storage.upload(
        {
          Bucket: this.bucket,
          Key: name,
          Body: file,
        },
        (err, data) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(data);
        }
      );
    });
  }

  deleteFromS3(name) {
    writeOutput("Deleting from S3", name);

    return new Promise((resolve, reject) => {
      this.storage.deleteObject(
        {
          Bucket: this.bucket,
          Key: name,
        },
        (err, data) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(data);
        }
      );
    });
  }

  convertToText(name, uri) {
    writeOutput("Start converting", name, uri);
    return new Promise((resolve, reject) => {
      this.service.startTranscriptionJob(
        {
          Media: {
            MediaFileUri: uri,
          },
          MediaFormat: "wav",
          LanguageCode: "ru-RU",
          TranscriptionJobName: name,
        },
        (err, data) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(data);
        }
      );
    });
  }

  removeTranscriptionJob(name) {
    writeOutput("Remove transcription job", name);
    return new Promise((resolve, reject) => {
      this.service.deleteTranscriptionJob(
        {
          TranscriptionJobName: name,
        },
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        }
      );
    });
  }

  getJob(name) {
    writeOutput("Check the job", name);
    return new Promise((resolve, reject) => {
      this.service.getTranscriptionJob(
        {
          TranscriptionJobName: name,
        },
        (err, data) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(data);
        }
      );
    })
      .then((job) => {
        return {
          isExists: true,
          job,
        };
      })
      .catch((err) => {
        return {
          isExists: false,
          err,
        };
      });
  }
}

module.exports = {
  AWSProvider,
};
