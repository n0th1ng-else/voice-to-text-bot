import AWS from "aws-sdk";
import { type ConverterMeta, type LanguageCode, VoiceConverter } from "./types.js";
import { getWavBuffer } from "../ffmpeg/index.js";
import { Logger } from "../logger/index.js";
import { TimeMeasure } from "../common/timer.js";
import { trackRecognitionTime } from "../monitoring/newrelic.js";

const logger = new Logger("aws-recognition");

type AWSJob = AWS.TranscribeService.Types.GetTranscriptionJobResponse;

type AWSTranscriptionResponse = AWS.TranscribeService.Types.StartTranscriptionJobResponse;

type AWSUpload = AWS.S3.ManagedUpload.SendData;

type AWSDeleteObject = AWS.S3.Types.DeleteObjectOutput;

type TranscriptionData = {
  results: {
    transcripts: {
      transcript: string;
    }[];
  };
};

type AWSVoiceProviderOptions = {
  bucketRegion: string;
  bucket: string;
  poolId: string;
};

export class AWSProvider extends VoiceConverter {
  private readonly bucket: string;
  private readonly storage: AWS.S3;
  private readonly service: AWS.TranscribeService;

  constructor(options: AWSVoiceProviderOptions) {
    super();

    logger.info("Using AWS");

    AWS.config.update({
      region: options.bucketRegion,
      credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: options.poolId,
      }),
    });

    this.bucket = options.bucket;
    this.storage = new AWS.S3();
    this.service = new AWS.TranscribeService();
  }

  public transformToText(
    fileLink: string,
    _lang: LanguageCode,
    logData: ConverterMeta,
    isLocalFile: boolean,
  ): Promise<string> {
    const name = `${logData.fileId}.ogg`;
    logger.info(`Starting process for ${Logger.y(name)}`);
    const duration = new TimeMeasure();

    return this.getJob(name)
      .then((data) => {
        if (data.isExists) {
          logger.info("Job exists. skipping");
          return this.getJobWithDelay(name, data.job);
        }

        return this.processFile(fileLink, name, isLocalFile);
      })
      .then(async (job) => {
        const url = job.TranscriptionJob?.Transcript?.TranscriptFileUri;
        if (!url) {
          throw new Error("Could not find the job transcript url");
        }
        const res = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Could not fetch the job transcript result");
        }

        const data = await res.json();
        return data;
      })
      .then((translationData) => this.cleanStorage(translationData as TranscriptionData, name))
      .then((text) => {
        logger.info(`Job ${name} completed`);
        trackRecognitionTime("AWS", duration.getMs());
        return text;
      });
  }

  private processFile(fileLink: string, name: string, isLocalFile: boolean): Promise<AWSJob> {
    return getWavBuffer(fileLink, isLocalFile)
      .then((file) => this.uploadToS3(name, file))
      .then((info) => this.convertToText(name, info.Location))
      .then((info) => this.getJobWithDelay(name, info));
  }

  private async unpackTranscription(translationData: TranscriptionData): Promise<string> {
    const transcripts = translationData.results.transcripts;
    if (!transcripts?.length) {
      throw new Error("Unable to convert into text");
    }

    return transcripts[0].transcript;
  }

  private cleanStorage(translationData: TranscriptionData, name: string): Promise<string> {
    return this.deleteFromS3(name)
      .then(() => this.removeTranscriptionJob(name))
      .then(() => this.unpackTranscription(translationData));
  }

  private async getJobWithDelay(name: string, job: AWSJob): Promise<AWSJob> {
    logger.info("Scheduling job", name);
    if (job.TranscriptionJob?.TranscriptionJobStatus !== "IN_PROGRESS") {
      return job;
    }

    return new Promise<void>((resolve) => setTimeout(() => resolve(), 1000))
      .then(() => this.getJob(name))
      .then((info) => {
        if (!info.isExists) {
          throw new Error("unable to get the job", {
            cause: info.err,
          });
        }
        return info.job;
      })
      .then((job) => this.getJobWithDelay(name, job));
  }

  private uploadToS3(name: string, file: Buffer<ArrayBufferLike>): Promise<AWSUpload> {
    logger.info("Uploading to S3", name);
    return new Promise<AWSUpload>((resolve, reject) => {
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
        },
      );
    });
  }

  private deleteFromS3(name: string): Promise<AWSDeleteObject> {
    logger.info("Deleting from S3", name);

    return new Promise<AWSDeleteObject>((resolve, reject) => {
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
        },
      );
    });
  }

  private convertToText(name: string, uri: string): Promise<AWSTranscriptionResponse> {
    logger.info("Start converting", name, uri);
    return new Promise<AWSTranscriptionResponse>((resolve, reject) => {
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
        },
      );
    });
  }

  private removeTranscriptionJob(name: string): Promise<void> {
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
        },
      );
    });
  }

  private async getJob(name: string): Promise<JobResponse> {
    logger.info("Check the job", name);
    return new Promise<JobResponse>((resolve) => {
      this.service.getTranscriptionJob(
        {
          TranscriptionJobName: name,
        },
        (err, data) => {
          if (err) {
            resolve({
              isExists: false,
              err,
            } as const);
            return;
          }

          resolve({
            isExists: true,
            job: data,
          } as const);
        },
      );
    });
  }
}

type JobResponse = { isExists: true; job: AWSJob } | { isExists: false; err: unknown };
