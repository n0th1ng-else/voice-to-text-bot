import axios from "axios";
import { VoiceConverter, VoiceConverterOptions } from "./types.js";
import { getWav } from "../ffmpeg/index.js";
import { Logger } from "../logger/index.js";

const AWS = require("aws-sdk");

const logger = new Logger("aws-recognition");

export class AWSProvider extends VoiceConverter {
  private bucket: any;
  private storage: any;
  private service: any;

  constructor(options: VoiceConverterOptions) {
    super();

    logger.info("Using AWS");

    AWS.config.update({
      region: (options as any).AWS_BUCKET_REGION,
      credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: (options as any).AWS_POOL_ID,
      }),
    });

    this.bucket = (options as any).AWS_BUCKET;
    this.storage = new AWS.S3();
    this.service = new AWS.TranscribeService();
  }

  public transformToText(
    fileLink: string,
    fileId: string,
    isVideo: boolean
  ): Promise<string> {
    const name = `${fileId}.ogg`;
    logger.info(`Starting process for ${Logger.y(name)}`);
    return (
      this.getJob(name)
        .then((data) => {
          if (data.isExists) {
            logger.info("Job exists. skipping");
            return this.getJobWithDelay(name, data.job);
          }

          return this.processFile(fileLink, name, isVideo);
        })
        // .then((job) => fetch(job.TranscriptionJob.Transcript.TranscriptFileUri))
        .then((job) =>
          axios.request({
            method: "GET",
            url: job.TranscriptionJob.Transcript.TranscriptFileUri,
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
          })
        )
        .then(({ data: translationData }) =>
          this.cleanStorage(translationData, name)
        )
        .then((text) => {
          logger.info(`Job ${name} completed`);
          return text;
        })
    );
  }

  private processFile(fileLink, name, isVideo): Promise<any> {
    return getWav(fileLink, isVideo)
      .then((file) => this.uploadToS3(name, file))
      .then((info) => this.convertToText(name, info.Location))
      .then((info) => this.getJobWithDelay(name, info));
  }

  private unpackTranscription(translationData): Promise<any> {
    const transcripts = translationData.results.transcripts;
    if (!transcripts || !transcripts.length) {
      throw new Error("Unable to convert into text");
    }

    return Promise.resolve(transcripts[0].transcript);
  }

  private cleanStorage(translationData, name): Promise<any> {
    return this.deleteFromS3(name)
      .then(() => this.removeTranscriptionJob(name))
      .then(() => this.unpackTranscription(translationData));
  }

  private getJobWithDelay(name, job): Promise<any> {
    logger.info("Scheduling job", name);
    if (job.TranscriptionJob.TranscriptionJobStatus !== "IN_PROGRESS") {
      return Promise.resolve(job);
    }

    return new Promise<void>((resolve) => setTimeout(() => resolve(), 1000))
      .then(() => this.getJob(name))
      .then((info) => this.getJobWithDelay(name, info.job));
  }

  private uploadToS3(name, file): Promise<any> {
    logger.info("Uploading to S3", name);
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

  private deleteFromS3(name): Promise<any> {
    logger.info("Deleting from S3", name);

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

  private convertToText(name, uri): Promise<any> {
    logger.info("Start converting", name, uri);
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

  private removeTranscriptionJob(name): Promise<any> {
    logger.info("Remove transcription job", name);
    return new Promise<void>((resolve, reject) => {
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

  private getJob(name: string): Promise<any> {
    logger.info("Check the job", name);
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
