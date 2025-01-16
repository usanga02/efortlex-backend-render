import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';
import { format } from 'util';

type FileType = {
  filename: string;
  buffer: Buffer;
  metadata: { [key: string]: string }[];
};
@Injectable()
export class UploadService {
  private readonly storage = new Storage({
    credentials: JSON.parse(
      this.configService.get('GOOGLE_CLOUD_CREDENTIALS') || '{}',
    ),
  });

  constructor(private configService: ConfigService) {}

  upload(args: FileType) {
    const { buffer, filename, metadata } = args;
    return new Promise<{ url: string }>((resolve, reject) => {
      const bucket = this.storage.bucket(
        this.configService.get('STORAGE_BUCKET_NAME'),
      );

      const blob = bucket.file(filename);

      const object = metadata.reduce(
        (obj, item) => Object.assign(obj, item),
        {},
      );

      const file = bucket.file(filename);

      const stream = file.createWriteStream();

      stream.on('error', (err: any) => {
        console.log('UploadError:', err);
        reject(err);
      });

      stream.on('finish', async () => {
        const publicUrl = format(
          `https://storage.googleapis.com/${bucket.name}/${blob.name}`,
        );
        try {
          await bucket.file(filename).makePublic();
        } catch {
          console.log(
            `Uploaded the file successfully: ${filename}, but public access is denied!`,
          );
        }

        await file.setMetadata({
          metadata: object,
        });

        resolve({ url: publicUrl });
      });
      stream.end(buffer);
    });
  }

  async uploadMany(files: FileType[]) {
    const urlList: { url: string }[] = [];

    for (let i = 0; i < files.length; i++) {
      const publicUrl = await this.upload(files[i]);
      urlList.push(publicUrl);
    }

    return urlList.map((value) => value.url);
  }
}
